import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  findAddressByMigrationKey,
  insertCurrentPersonAddress,
  insertCurrentProcessAddress,
  listProcessAddresses,
  pickStructuredAddressFields,
} from "../lib/individualProcessAddresses";
import { emptyAddressMigrationCounts } from "../../lib/utils/address-migration";
import {
  runAddressMigrationInvocation,
  type AddressMigrationPorts,
  type MigrationPhase,
} from "../../lib/utils/address-migration-run";

const countsValidator = v.object({
  personFlagOnly: v.number(),
  personConcatenated: v.number(),
  personMigrated: v.number(),
  processBackfilled: v.number(),
  processRowsUpdated: v.number(),
  processConcatenated: v.number(),
});

const phaseValidator = v.union(
  v.literal("process_rows"),
  v.literal("process_embedded"),
  v.literal("people"),
);

const resultValidator = v.object({
  dryRun: v.boolean(),
  phase: v.union(phaseValidator, v.literal("done")),
  isDone: v.boolean(),
  continueCursor: v.union(v.string(), v.null()),
  nextPhase: v.union(phaseValidator, v.literal("done")),
  counts: countsValidator,
  scanned: v.number(),
});

function createConvexPorts(ctx: MutationCtx): AddressMigrationPorts {
  return {
    paginateProcessRows: async (cursor, numItems) => {
      const page = await ctx.db
        .query("individualProcessAddresses")
        .order("asc")
        .paginate({ cursor, numItems });
      return {
        page: page.page,
        isDone: page.isDone,
        continueCursor: page.continueCursor,
      };
    },
    paginateProcesses: async (cursor, numItems) => {
      const page = await ctx.db
        .query("individualProcesses")
        .order("asc")
        .paginate({ cursor, numItems });
      return {
        page: page.page,
        isDone: page.isDone,
        continueCursor: page.continueCursor,
      };
    },
    paginatePeople: async (cursor, numItems) => {
      const page = await ctx.db
        .query("people")
        .order("asc")
        .paginate({ cursor, numItems });
      return {
        page: page.page,
        isDone: page.isDone,
        continueCursor: page.continueCursor,
      };
    },
    getProcess: async (id) => {
      return await ctx.db.get(id as Id<"individualProcesses">);
    },
    countProcessAddresses: async (processId) => {
      const rows = await listProcessAddresses(
        ctx,
        processId as Id<"individualProcesses">,
      );
      return rows.length;
    },
    hasMigrationKey: async (migrationKey) => {
      return Boolean(await findAddressByMigrationKey(ctx, migrationKey));
    },
    updateProcessRow: async (id, reportedAt) => {
      const patch: Partial<Doc<"individualProcessAddresses">> = {
        ownerType: "process",
        updatedAt: Date.now(),
      };
      if (reportedAt) patch.reportedAt = reportedAt;
      await ctx.db.patch(id as Id<"individualProcessAddresses">, patch);
    },
    concatenateProcessLegacy: async (processId, nextLegacy) => {
      await ctx.db.patch(processId as Id<"individualProcesses">, {
        residenceAddressAbroad: nextLegacy,
        updatedAt: Date.now(),
      });
    },
    insertProcessBackfill: async (args) => {
      await insertCurrentProcessAddress(ctx, {
        individualProcessId: args.processId as Id<"individualProcesses">,
        fields: pickStructuredAddressFields(args.fields),
        reportedAt: args.reportedAt,
        migrationKey: args.migrationKey,
        now: args.now,
      });
    },
    concatenatePersonLegacy: async (personId, nextLegacy) => {
      await ctx.db.patch(personId as Id<"people">, {
        address: nextLegacy,
        updatedAt: Date.now(),
      });
    },
    insertPersonMigrated: async (args) => {
      await insertCurrentPersonAddress(ctx, {
        personId: args.personId as Id<"people">,
        fields: pickStructuredAddressFields(args.fields),
        reportedAt: args.reportedAt,
        migrationKey: args.migrationKey,
        now: args.now,
      });
    },
  };
}

/**
 * Idempotent address-owner migration.
 *
 * Convex allows only one `.paginate()` per mutation invocation. This function
 * therefore never continues into another table (or another page of a different
 * phase) in the same call. At a phase boundary it returns isDone=false with
 * nextPhase set and continueCursor=null.
 *
 * The caller MUST keep invoking until isDone=true, passing nextPhase,
 * continueCursor, and counts:
 *
 *   pnpm exec convex run migrations/migrateAddresses:run '{"dryRun":true}'
 *   # then, while isDone is false:
 *   pnpm exec convex run migrations/migrateAddresses:run '{"dryRun":true,"phase":"<nextPhase>","cursor":<continueCursor>,"counts":<counts>}'
 *
 * Apply uses the same loop with `"dryRun":false`.
 */
export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    phase: v.optional(phaseValidator),
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
    const phase: MigrationPhase = args.phase ?? "process_rows";

    return await runAddressMigrationInvocation(
      {
        dryRun,
        phase,
        cursor: args.cursor ?? null,
        batchSize,
        counts: args.counts
          ? { ...args.counts }
          : emptyAddressMigrationCounts(),
      },
      createConvexPorts(ctx),
    );
  },
});
