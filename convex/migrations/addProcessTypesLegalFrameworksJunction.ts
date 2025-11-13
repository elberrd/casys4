/**
 * Migration Script: Create Process Types - Legal Frameworks Junction Table
 *
 * This migration creates a many-to-many relationship between Process Types and Legal Frameworks
 * by migrating existing one-to-many relationships to a junction table.
 *
 * Changes:
 * - Creates processTypesLegalFrameworks junction table records
 * - Preserves existing relationships from legalFrameworks.processTypeId
 * - Sets processTypeId to undefined in legalFrameworks after migration
 *
 * Features:
 * - Idempotent (safe to run multiple times)
 * - Progress logging
 * - Handles null/undefined processTypeIds gracefully
 * - Uses system user for createdBy field
 *
 * Usage:
 * npx convex run migrations/addProcessTypesLegalFrameworksJunction
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export default internalMutation({
  handler: async (ctx) => {
    console.log("=== Starting Migration: Process Types - Legal Frameworks Junction ===\n");

    const startTime = Date.now();
    let junctionCreated = 0;
    let skipped = 0;
    let alreadyMigrated = 0;
    const errors: string[] = [];

    try {
      // Get the first admin user to use as createdBy
      const adminUser = await ctx.db
        .query("userProfiles")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .first();

      if (!adminUser || !adminUser.userId) {
        throw new Error("No admin user found. Please ensure at least one admin user exists before running this migration.");
      }

      console.log(`Using admin user ${adminUser.email} as creator for junction records\n`);

      // Get all legal frameworks that have a processTypeId
      const allLegalFrameworks = await ctx.db.query("legalFrameworks").collect();
      console.log(`Found ${allLegalFrameworks.length} legal frameworks to process`);

      for (const lf of allLegalFrameworks) {
        try {
          // Use type assertion to access deprecated processTypeId field
          const lfWithOldField = lf as any;

          // Skip if no processTypeId (already migrated or never had one)
          if (!lfWithOldField.processTypeId) {
            skipped++;
            console.log(`  ⊘ Skipped: ${lf.name} - no processTypeId`);
            continue;
          }

          // Check if junction record already exists
          const existingJunction = await ctx.db
            .query("processTypesLegalFrameworks")
            .withIndex("by_processType_legalFramework", (q) =>
              q.eq("processTypeId", lfWithOldField.processTypeId).eq("legalFrameworkId", lf._id)
            )
            .first();

          if (existingJunction) {
            alreadyMigrated++;
            console.log(`  ⊘ Already migrated: ${lf.name}`);
            continue;
          }

          // Create junction table record
          await ctx.db.insert("processTypesLegalFrameworks", {
            processTypeId: lfWithOldField.processTypeId,
            legalFrameworkId: lf._id,
            createdAt: Date.now(),
            createdBy: adminUser.userId!,
          });

          junctionCreated++;
          console.log(`  ✓ Created junction: ${lf.name} → Process Type`);

          // Note: We're NOT removing processTypeId yet - that will be done after schema deployment
          // The schema change will handle the removal automatically
        } catch (error) {
          const errorMsg = `Failed to migrate legal framework ${lf.name}: ${error}`;
          errors.push(errorMsg);
          console.error(`  ✗ Error: ${errorMsg}`);
        }
      }

      const duration = Date.now() - startTime;

      console.log("\n=== Migration Summary ===");
      console.log(`Total legal frameworks: ${allLegalFrameworks.length}`);
      console.log(`Junction records created: ${junctionCreated}`);
      console.log(`Skipped (no processTypeId): ${skipped}`);
      console.log(`Already migrated: ${alreadyMigrated}`);
      console.log(`Errors: ${errors.length}`);
      console.log(`Duration: ${duration}ms`);

      if (errors.length > 0) {
        console.error("\nErrors encountered:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      console.log("\n=== Migration Complete ===");
      console.log("\nNOTE: The processTypeId field will be automatically removed from");
      console.log("legalFrameworks table when the new schema is deployed.");

      return {
        total: allLegalFrameworks.length,
        junctionCreated,
        skipped,
        alreadyMigrated,
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
