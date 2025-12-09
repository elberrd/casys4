import { internalMutation } from "../_generated/server";

/**
 * Migration: Convert isActive boolean to processStatus enum
 *
 * This migration updates all existing individual processes to use the new
 * processStatus field instead of the deprecated isActive boolean.
 *
 * Mapping:
 * - isActive = true  -> processStatus = "Atual"
 * - isActive = false -> processStatus = "Anterior"
 * - isActive = null/undefined -> processStatus = "Atual" (default)
 */
export const migrateProcessStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const processes = await ctx.db.query("individualProcesses").collect();

    let migratedCount = 0;
    let skippedCount = 0;

    for (const process of processes) {
      // Skip if processStatus is already set
      if (process.processStatus !== undefined) {
        skippedCount++;
        continue;
      }

      // Determine processStatus based on isActive
      let processStatus: "Atual" | "Anterior";
      if (process.isActive === false) {
        processStatus = "Anterior";
      } else {
        // Default to "Atual" for true or undefined/null
        processStatus = "Atual";
      }

      // Update the process with the new field
      await ctx.db.patch(process._id, {
        processStatus,
      });

      migratedCount++;
    }

    return {
      totalProcesses: processes.length,
      migratedCount,
      skippedCount,
      message: `Migration complete: ${migratedCount} processes migrated, ${skippedCount} already had processStatus set`,
    };
  },
});
