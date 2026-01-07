/**
 * Migration: Add appointmentDateTime to RNM status fillableFields
 *
 * Updates the RNM case status to include the appointmentDateTime field
 * in its fillableFields array so users can fill in appointment date/time
 * when adding or editing RNM status in the status history.
 *
 * To run: npx convex run migrations/addAppointmentDateTimeToRnmFillableFields
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
        fillableFields: ["rnmNumber", "rnmProtocol", "rnmDeadline", "appointmentDateTime"],
        updatedAt: Date.now(),
      });
      console.log("✓ Added appointmentDateTime to RNM status fillableFields");
    }
    return { success: true };
  },
});
