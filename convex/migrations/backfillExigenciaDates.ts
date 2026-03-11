import { internalMutation } from "../_generated/server";

/**
 * One-time migration: Backfill maxDeliveryDate and clientDeadlineDate
 * for existing "exigência" status entries that don't have them.
 *
 * Run via dashboard or CLI:
 *   npx convex run --component migrations/backfillExigenciaDates:run
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all caseStatuses with code "exigencia"
    const allCaseStatuses = await ctx.db.query("caseStatuses").collect();
    const exigenciaIds = new Set(
      allCaseStatuses
        .filter((cs) => cs.code === "exigencia")
        .map((cs) => cs._id)
    );

    if (exigenciaIds.size === 0) {
      console.log("No exigência case status found. Nothing to migrate.");
      return { migratedCount: 0, skippedCount: 0 };
    }

    // Find all status entries for those caseStatuses
    const allStatuses = await ctx.db
      .query("individualProcessStatuses")
      .collect();

    const addDays = (d: Date, days: number) => {
      const r = new Date(d);
      r.setDate(r.getDate() + days);
      return r.toISOString().split("T")[0];
    };

    let migratedCount = 0;
    let skippedCount = 0;

    for (const status of allStatuses) {
      if (!exigenciaIds.has(status.caseStatusId)) continue;

      // Skip if already has both dates
      if (status.maxDeliveryDate && status.clientDeadlineDate) {
        skippedCount++;
        continue;
      }

      // Calculate dates from the status date
      const statusDate =
        status.date || new Date(status.changedAt).toISOString();
      const datePart = statusDate.split("T")[0];
      const base = new Date(datePart + "T12:00:00");

      await ctx.db.patch(status._id, {
        maxDeliveryDate: status.maxDeliveryDate || addDays(base, 29),
        clientDeadlineDate: status.clientDeadlineDate || addDays(base, 23),
      });

      migratedCount++;
    }

    console.log(
      `Migration complete: ${migratedCount} exigência entries backfilled, ${skippedCount} already had dates.`
    );
    return { migratedCount, skippedCount };
  },
});
