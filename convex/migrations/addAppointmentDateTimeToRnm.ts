/**
 * Migration: Add appointmentDateTime back to RNM fillableFields
 *
 * Issue: The appointmentDateTime field was incorrectly removed from RNM status.
 * This field is needed to schedule when the person will do their RNM registration.
 *
 * Solution:
 * - RNM status should allow editing: rnmNumber, rnmDeadline, appointmentDateTime
 *
 * To run this migration:
 * npx convex run migrations/addAppointmentDateTimeToRnm
 */

import { internalMutation } from "../_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    console.log("Starting appointmentDateTime fix migration...");

    // Fix RNM status to include appointmentDateTime
    const rnmStatus = await ctx.db
      .query("caseStatuses")
      .withIndex("by_code", (q) => q.eq("code", "rnm"))
      .first();

    if (rnmStatus) {
      console.log(`Found RNM status (${rnmStatus._id})`);
      console.log(`Current fillableFields:`, rnmStatus.fillableFields);

      await ctx.db.patch(rnmStatus._id, {
        fillableFields: ["rnmNumber", "rnmDeadline", "appointmentDateTime"],
        updatedAt: Date.now(),
      });

      console.log(`✓ Updated RNM status fillableFields to: ["rnmNumber", "rnmDeadline", "appointmentDateTime"]`);
    } else {
      console.log("⚠ RNM status not found");
    }

    console.log("\n=== Migration completed successfully ===");

    return {
      success: true,
      rnmUpdated: !!rnmStatus,
    };
  },
});
