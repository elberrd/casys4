import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";

const migrationResultValidator = v.object({
  updated: v.number(),
  missingProcess: v.number(),
  skipped: v.number(),
  isDone: v.boolean(),
  continueCursor: v.union(v.string(), v.null()),
});

/**
 * Idempotently initializes the business waiting start from the original
 * creation timestamp of each document's individual process.
 *
 * Run repeatedly with the returned cursor until `isDone` is true.
 */
export const run = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  returns: migrationResultValidator,
  handler: async (ctx, args) => {
    const batchSize = Math.min(
      Math.max(Math.floor(args.batchSize ?? 250), 1),
      500,
    );
    const page = await ctx.db
      .query("documentsDelivered")
      .order("asc")
      .paginate({ cursor: args.cursor ?? null, numItems: batchSize });

    const processCreatedAtById = new Map<
      Id<"individualProcesses">,
      number | null
    >();
    let updated = 0;
    let missingProcess = 0;
    let skipped = 0;

    for (const document of page.page) {
      if (document.waitingStartedAt !== undefined) {
        skipped += 1;
        continue;
      }

      let processCreatedAt = processCreatedAtById.get(
        document.individualProcessId,
      );
      if (processCreatedAt === undefined) {
        const individualProcess = await ctx.db.get(
          document.individualProcessId,
        );
        processCreatedAt = individualProcess?.createdAt ?? null;
        processCreatedAtById.set(
          document.individualProcessId,
          processCreatedAt,
        );
      }

      if (processCreatedAt === null) {
        missingProcess += 1;
        continue;
      }

      await ctx.db.patch(document._id, {
        waitingStartedAt: processCreatedAt,
      });
      updated += 1;
    }

    return {
      updated,
      missingProcess,
      skipped,
      isDone: page.isDone,
      continueCursor: page.isDone ? null : page.continueCursor,
    };
  },
});
