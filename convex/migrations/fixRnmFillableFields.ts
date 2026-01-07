/**
 * Migration: Fix fillableFields for RNM and Em Trâmite statuses
 *
 * Issue: The protocolNumber field was being incorrectly modified when users
 * edited the RNM (Registro Nacional Migratório) status history.
 *
 * Solution:
 * - RNM status should only allow editing: rnmNumber, rnmDeadline
 * - Em Trâmite status should only allow editing: protocolNumber
 *
 * To run this migration:
 * npx convex run migrations/fixRnmFillableFields
 */

import { internalMutation } from "../_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    console.log("Starting fillableFields fix migration...");

    // Fix RNM status
    const rnmStatus = await ctx.db
      .query("caseStatuses")
      .withIndex("by_code", (q) => q.eq("code", "rnm"))
      .first();

    if (rnmStatus) {
      console.log(`Found RNM status (${rnmStatus._id})`);
      console.log(`Current fillableFields:`, rnmStatus.fillableFields);

      await ctx.db.patch(rnmStatus._id, {
        fillableFields: ["rnmNumber", "rnmDeadline"],
        updatedAt: Date.now(),
      });

      console.log(`✓ Updated RNM status fillableFields to: ["rnmNumber", "rnmDeadline"]`);
    } else {
      console.log("⚠ RNM status not found");
    }

    // Fix Em Trâmite status
    const emTramiteStatus = await ctx.db
      .query("caseStatuses")
      .withIndex("by_code", (q) => q.eq("code", "em_tramite"))
      .first();

    if (emTramiteStatus) {
      console.log(`Found Em Trâmite status (${emTramiteStatus._id})`);
      console.log(`Current fillableFields:`, emTramiteStatus.fillableFields);

      await ctx.db.patch(emTramiteStatus._id, {
        fillableFields: ["protocolNumber"],
        updatedAt: Date.now(),
      });

      console.log(`✓ Updated Em Trâmite status fillableFields to: ["protocolNumber"]`);
    } else {
      console.log("⚠ Em Trâmite status not found");
    }

    console.log("\n=== Migration completed successfully ===");

    return {
      success: true,
      rnmUpdated: !!rnmStatus,
      emTramiteUpdated: !!emTramiteStatus,
    };
  },
});
