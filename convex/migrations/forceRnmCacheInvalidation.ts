/**
 * Migration: Force cache invalidation for RNM status
 *
 * Forces Convex to invalidate client-side cache by touching the RNM record.
 * This ensures clients receive the updated fillableFields array.
 *
 * To run: npx convex run migrations/forceRnmCacheInvalidation
 */

import { internalMutation } from "../_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    const rnmStatus = await ctx.db
      .query("caseStatuses")
      .withIndex("by_code", (q) => q.eq("code", "rnm"))
      .first();

    if (rnmStatus) {
      // Touch the record to force cache invalidation
      await ctx.db.patch(rnmStatus._id, {
        updatedAt: Date.now(),
      });
      console.log("✓ Forced cache invalidation for RNM status");
      console.log("  fillableFields:", rnmStatus.fillableFields);
    } else {
      console.log("✗ RNM status not found");
    }
    return { success: true };
  },
});
