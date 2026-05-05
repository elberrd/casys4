import { internalMutation } from "../_generated/server";

/**
 * One-time migration: Backfill existing placeholder documents (status="not_started"
 * with no attached file) from version=1 to version=0.
 *
 * This aligns historical records with the new versioning convention where:
 *   - v0 = empty placeholder ("pedido criado")
 *   - v1+ = filled with attachment or information
 *
 * Run via dashboard or CLI:
 *   npx convex run migrations/backfillPlaceholderVersionZero:run
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("documentsDelivered").collect();

    let migrated = 0;
    let skipped = 0;

    for (const doc of docs) {
      if (doc.version !== 1) {
        skipped++;
        continue;
      }
      if (doc.status !== "not_started") {
        skipped++;
        continue;
      }
      const hasFile = !!doc.storageId || (doc.fileUrl && doc.fileUrl !== "");
      if (hasFile) {
        skipped++;
        continue;
      }

      await ctx.db.patch(doc._id, { version: 0 });
      migrated++;
    }

    console.log(
      `Migration complete: ${migrated} placeholder docs moved to v0, ${skipped} skipped.`,
    );
    return { migrated, skipped };
  },
});
