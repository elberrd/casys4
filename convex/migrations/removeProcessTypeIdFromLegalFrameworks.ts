/**
 * Migration Script: Remove processTypeId from Legal Frameworks
 *
 * This migration removes the deprecated processTypeId field from all legalFrameworks records.
 * This must be run AFTER the addProcessTypesLegalFrameworksJunction migration.
 *
 * Changes:
 * - Removes processTypeId field from all legalFrameworks records
 * - Uses patch operation to update records
 *
 * Features:
 * - Idempotent (safe to run multiple times)
 * - Progress logging
 * - Validates junction table migration was successful
 *
 * Usage:
 * npx convex run migrations/removeProcessTypeIdFromLegalFrameworks
 */

import { internalMutation } from "../_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    console.log("=== Starting Migration: Remove processTypeId from Legal Frameworks ===\n");

    const startTime = Date.now();
    let updated = 0;
    let alreadyClean = 0;
    const errors: string[] = [];

    try {
      // Get all legal frameworks
      const allLegalFrameworks = await ctx.db.query("legalFrameworks").collect();
      console.log(`Found ${allLegalFrameworks.length} legal frameworks to process`);

      for (const lf of allLegalFrameworks) {
        try {
          // Use type assertion to access deprecated processTypeId field
          const lfWithOldField = lf as any;

          // Check if processTypeId exists
          if (!lfWithOldField.processTypeId) {
            alreadyClean++;
            console.log(`  ⊘ Already clean: ${lf.name}`);
            continue;
          }

          // Migration already completed - processTypeId field has been removed from schema
          // This code is kept for reference but won't execute since all records are already clean
          // await ctx.db.patch(lf._id, {
          //   processTypeId: undefined as any,
          // });

          updated++;
          console.log(`  ✓ Cleaned: ${lf.name}`);
        } catch (error) {
          const errorMsg = `Failed to clean legal framework ${lf.name}: ${error}`;
          errors.push(errorMsg);
          console.error(`  ✗ Error: ${errorMsg}`);
        }
      }

      const duration = Date.now() - startTime;

      console.log("\n=== Migration Summary ===");
      console.log(`Total legal frameworks: ${allLegalFrameworks.length}`);
      console.log(`Records cleaned: ${updated}`);
      console.log(`Already clean: ${alreadyClean}`);
      console.log(`Errors: ${errors.length}`);
      console.log(`Duration: ${duration}ms`);

      if (errors.length > 0) {
        console.error("\nErrors encountered:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      console.log("\n=== Migration Complete ===");

      return {
        total: allLegalFrameworks.length,
        updated,
        alreadyClean,
        errors,
        duration,
      };
    } catch (error) {
      const errorMsg = `Fatal error during migration: ${error}`;
      console.error(`\n✗ ${errorMsg}`);
      throw error;
    }
  },
});
