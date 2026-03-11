import { internalMutation } from "../_generated/server";

/**
 * One-time migration: Backfill userApplicantCompanyId for existing individual processes
 * that have a userApplicantId but no stored company.
 *
 * For each, looks up the person's current company via peopleCompanies (best effort).
 *
 * Run via dashboard:
 *   npx convex run migrations/backfillUserApplicantCompanyId:run
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allProcesses = await ctx.db.query("individualProcesses").collect();

    let migratedCount = 0;
    let skippedCount = 0;
    let noCompanyCount = 0;

    for (const process of allProcesses) {
      // Skip if no userApplicantId or already has userApplicantCompanyId
      if (!process.userApplicantId) {
        skippedCount++;
        continue;
      }

      if (process.userApplicantCompanyId) {
        skippedCount++;
        continue;
      }

      // Look up the person's current company
      const personCompany = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_person", (q) => q.eq("personId", process.userApplicantId!))
        .filter((q) => q.eq(q.field("isCurrent"), true))
        .first();

      if (personCompany?.companyId) {
        await ctx.db.patch(process._id, {
          userApplicantCompanyId: personCompany.companyId,
        });
        migratedCount++;
      } else {
        noCompanyCount++;
      }
    }

    console.log(
      `Migration complete: ${migratedCount} processes backfilled, ${skippedCount} skipped, ${noCompanyCount} had no current company.`
    );
    return { migratedCount, skippedCount, noCompanyCount };
  },
});
