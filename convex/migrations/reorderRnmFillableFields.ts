/**
 * Migration: Reorder RNM status fillableFields
 *
 * Updates the RNM case status to reorder fillableFields so that
 * appointmentDateTime appears first in the modal.
 *
 * New order:
 * 1. appointmentDateTime (Data e Hora do Agendamento)
 * 2. rnmNumber (Número RNM)
 * 3. rnmProtocol (Protocolo RNM)
 * 4. rnmDeadline (Validade do RNM)
 *
 * To run: npx convex run migrations/reorderRnmFillableFields
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
        fillableFields: ["appointmentDateTime", "rnmNumber", "rnmProtocol", "rnmDeadline"],
        updatedAt: Date.now(),
      });
      console.log("✓ Reordered RNM status fillableFields - appointmentDateTime is now first");
    }
    return { success: true };
  },
});
