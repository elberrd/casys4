/**
 * Migration: Fix RNM fillableFields by forcing a real data change
 *
 * Forces Convex to recognize the change by temporarily clearing and
 * then restoring the fillableFields array.
 *
 * To run: npx convex run migrations/fixRnmFillableFields
 */

import { internalMutation } from "../_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    const rnmStatus = await ctx.db
      .query("caseStatuses")
      .withIndex("by_code", (q) => q.eq("code", "rnm"))
      .first();

    if (!rnmStatus) {
      console.log("✗ RNM status not found");
      return { success: false };
    }

    console.log("Current fillableFields:", rnmStatus.fillableFields);

    // Step 1: Clear the array to force a change
    await ctx.db.patch(rnmStatus._id, {
      fillableFields: [],
      updatedAt: Date.now(),
    });

    console.log("✓ Cleared fillableFields");

    // Step 2: Restore with correct values
    await ctx.db.patch(rnmStatus._id, {
      fillableFields: ["appointmentDateTime", "rnmNumber", "rnmProtocol", "rnmDeadline"],
      updatedAt: Date.now(),
    });

    console.log("✓ Restored fillableFields with appointmentDateTime first");

    return { success: true };
  },
});
