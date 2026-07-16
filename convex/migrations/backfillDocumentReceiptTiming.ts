import { v } from "convex/values";

import { internalMutation } from "../_generated/server";
import { hasDocumentContent } from "../lib/documentReceiptTiming";

const migrationResultValidator = v.object({
  updated: v.number(),
  inferredReceived: v.number(),
  skipped: v.number(),
  isDone: v.boolean(),
  continueCursor: v.union(v.string(), v.null()),
});

/**
 * Idempotently backfills lifecycle timestamps for legacy document versions.
 * Run repeatedly with the returned cursor until `isDone` is true.
 */
export const run = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  returns: migrationResultValidator,
  handler: async (ctx, args) => {
    const batchSize = Math.min(Math.max(Math.floor(args.batchSize ?? 250), 1), 500);
    const page = await ctx.db
      .query("documentsDelivered")
      .order("asc")
      .paginate({ cursor: args.cursor ?? null, numItems: batchSize });

    let updated = 0;
    let inferredReceived = 0;
    let skipped = 0;

    for (const document of page.page) {
      const createdAt = document.createdAt ?? document._creationTime;
      const shouldInferReceived =
        document.receivedAt === undefined && hasDocumentContent(document);
      const receivedAt = shouldInferReceived
        ? document.uploadedAt
        : document.receivedAt;

      if (
        document.createdAt !== undefined &&
        (!shouldInferReceived || document.receivedAt !== undefined)
      ) {
        skipped += 1;
        continue;
      }

      await ctx.db.patch(document._id, {
        createdAt,
        receivedAt,
      });
      updated += 1;
      if (shouldInferReceived) inferredReceived += 1;
    }

    return {
      updated,
      inferredReceived,
      skipped,
      isDone: page.isDone,
      continueCursor: page.isDone ? null : page.continueCursor,
    };
  },
});
