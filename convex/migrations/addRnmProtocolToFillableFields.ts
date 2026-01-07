/**
 * Migration: Add rnmProtocol to RNM status fillableFields
 *
 * Updates the RNM case status to include the new rnmProtocol field
 * in its fillableFields array alongside rnmNumber and rnmDeadline.
 *
 * To run: npx convex run migrations/addRnmProtocolToFillableFields
 */

import { internalMutation } from "../_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    const rnmStatus = await ctx.db
      .query("caseStatuses")
      .withIndex("by_code", (q) => q.eq("code", "rnm"))
      .first();

    if (rnmStatus) {
      await ctx.db.patch(rnmStatus._id, {
        fillableFields: ["rnmNumber", "rnmProtocol", "rnmDeadline"],
        updatedAt: Date.now(),
      });
      console.log("✓ Added rnmProtocol to RNM status fillableFields");
    }
    return { success: true };
  },
});
