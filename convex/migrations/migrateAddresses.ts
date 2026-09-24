import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import {
  findAddressByMigrationKey,
  insertCurrentPersonAddress,
  insertCurrentProcessAddress,
  listProcessAddresses,
  pickStructuredAddressFields,
} from "../lib/individualProcessAddresses";
import {
  classifyPersonEmbeddedAddress,
  classifyProcessEmbeddedAddress,
  classifyProcessTableRow,
  emptyAddressMigrationCounts,
  personEmbeddedMigrationKey,
  processEmbeddedMigrationKey,
  type AddressMigrationCounts,
} from "../../lib/utils/address-migration";

const countsValidator = v.object({
  personFlagOnly: v.number(),
  personConcatenated: v.number(),
  personMigrated: v.number(),
  processBackfilled: v.number(),
  processRowsUpdated: v.number(),
  processConcatenated: v.number(),
});

const resultValidator = v.object({
  dryRun: v.boolean(),
  phase: v.union(
    v.literal("process_rows"),
    v.literal("process_embedded"),
    v.literal("people"),
    v.literal("done"),
  ),
  isDone: v.boolean(),
  continueCursor: v.union(v.string(), v.null()),
  nextPhase: v.union(
    v.literal("process_rows"),
    v.literal("process_embedded"),
    v.literal("people"),
    v.literal("done"),
  ),
  counts: countsValidator,
  scanned: v.number(),
});

type Phase = "process_rows" | "process_embedded" | "people";

type RunResult = {
  dryRun: boolean;
  phase: Phase | "done";
  isDone: boolean;
  continueCursor: string | null;
  nextPhase: Phase | "done";
  counts: AddressMigrationCounts;
  scanned: number;
};

function pageResult(
  dryRun: boolean,
  phase: Phase | "done",
  isDone: boolean,
  continueCursor: string | null,
  nextPhase: Phase | "done",
  counts: AddressMigrationCounts,
  scanned: number,
): RunResult {
  return {
    dryRun,
    phase,
    isDone,
    continueCursor,
    nextPhase,
    counts,
    scanned,
  };
}

/**
 * Idempotent address-owner migration.
 *
 * Dry-run: `pnpm exec convex run migrations/migrateAddresses:run '{"dryRun":true}'`
 * Apply:    `pnpm exec convex run migrations/migrateAddresses:run '{"dryRun":false}'`
 *
 * If `isDone` is false, pass back `nextPhase`, `continueCursor`, and `counts`.
 */
export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    phase: v.optional(
      v.union(
        v.literal("process_rows"),
        v.literal("process_embedded"),
        v.literal("people"),
      ),
    ),
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
    counts: v.optional(countsValidator),
  },
  returns: resultValidator,
  handler: async (ctx, args) => {
    const dryRun = args.dryRun !== false;
    const batchSize = Math.min(
      Math.max(Math.floor(args.batchSize ?? 250), 1),
      400,
    );
    let phase: Phase = args.phase ?? "process_rows";
    let cursor: string | null = args.cursor ?? null;
    const counts: AddressMigrationCounts = args.counts
      ? { ...args.counts }
      : emptyAddressMigrationCounts();
    let scanned = 0;
    const maxPages = 20;

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
      if (phase === "process_rows") {
        const page = await ctx.db
          .query("individualProcessAddresses")
          .order("asc")
          .paginate({ cursor, numItems: batchSize });

        for (const row of page.page) {
          scanned += 1;
          if (row.ownerType === "person") continue;

          const processId = row.individualProcessId;
          const process = processId ? await ctx.db.get(processId) : null;
          const decision = classifyProcessTableRow(
            row,
            process?.residenceAddressAbroad,
          );

          if (decision.updateOwner) {
            counts.processRowsUpdated += 1;
            if (!dryRun) {
              const patch: Partial<Doc<"individualProcessAddresses">> = {
                ownerType: "process",
                updatedAt: Date.now(),
              };
              if (decision.reportedAt) patch.reportedAt = decision.reportedAt;
              await ctx.db.patch(row._id, patch);
            }
          }

          if (decision.concatenate && process && decision.nextLegacyAddress) {
            counts.processConcatenated += 1;
            if (!dryRun) {
              await ctx.db.patch(process._id, {
                residenceAddressAbroad: decision.nextLegacyAddress,
                updatedAt: Date.now(),
              });
            }
          }
        }

        if (!page.isDone) {
          return pageResult(
            dryRun,
            phase,
            false,
            page.continueCursor,
            phase,
            counts,
            scanned,
          );
        }

        phase = "process_embedded";
        cursor = null;
        continue;
      }

      if (phase === "process_embedded") {
        const page = await ctx.db
          .query("individualProcesses")
          .order("asc")
          .paginate({ cursor, numItems: batchSize });

        for (const process of page.page) {
          scanned += 1;
          const existing = await listProcessAddresses(ctx, process._id);
          const migrationKey = processEmbeddedMigrationKey(process._id);
          const already = await findAddressByMigrationKey(ctx, migrationKey);
          const decision = classifyProcessEmbeddedAddress(process, {
            hasTableRow: existing.length > 0,
            alreadyBackfilled: Boolean(already),
          });

          if (decision.bucket === "processEmbeddedSkipped") continue;

          if (decision.bucket === "processConcatenated") {
            counts.processConcatenated += 1;
            if (!dryRun) {
              await ctx.db.patch(process._id, {
                residenceAddressAbroad: decision.nextLegacyAddress,
                updatedAt: Date.now(),
              });
            }
            continue;
          }

          counts.processBackfilled += 1;
          if (!dryRun) {
            await insertCurrentProcessAddress(ctx, {
              individualProcessId: process._id,
              fields: decision.fields,
              reportedAt: decision.reportedAt,
              migrationKey: decision.migrationKey,
              now: process.createdAt ?? process._creationTime,
            });
          }
        }

        if (!page.isDone) {
          return pageResult(
            dryRun,
            phase,
            false,
            page.continueCursor,
            phase,
            counts,
            scanned,
          );
        }

        phase = "people";
        cursor = null;
        continue;
      }

      const page = await ctx.db
        .query("people")
        .order("asc")
        .paginate({ cursor, numItems: batchSize });

      for (const person of page.page) {
        scanned += 1;
        const migrationKey = personEmbeddedMigrationKey(person._id);
        const already = await findAddressByMigrationKey(ctx, migrationKey);
        const decision = classifyPersonEmbeddedAddress(person, {
          alreadyMigrated: Boolean(already),
          currentLegacyAddress: person.address,
        });

        if (decision.bucket === "personSkipped") continue;

        if (decision.bucket === "personFlagOnly") {
          counts.personFlagOnly += 1;
          continue;
        }

        if (decision.bucket === "personConcatenated") {
          counts.personConcatenated += 1;
          if (!dryRun) {
            await ctx.db.patch(person._id, {
              address: decision.nextLegacyAddress,
              updatedAt: Date.now(),
            });
          }
          continue;
        }

        counts.personMigrated += 1;
        if (!dryRun) {
          await insertCurrentPersonAddress(ctx, {
            personId: person._id,
            fields: pickStructuredAddressFields(decision.fields),
            reportedAt: decision.reportedAt,
            migrationKey: decision.migrationKey,
            now: person.createdAt ?? person._creationTime,
          });
        }
      }

      if (!page.isDone) {
        return pageResult(
          dryRun,
          "people",
          false,
          page.continueCursor,
          "people",
          counts,
          scanned,
        );
      }

      return pageResult(dryRun, "done", true, null, "done", counts, scanned);
    }

    return pageResult(dryRun, phase, false, cursor, phase, counts, scanned);
  },
});
