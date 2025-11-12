import { internalMutation } from "../_generated/server";

/**
 * Migration to add date field to existing individualProcessStatuses records
 *
 * This migration:
 * 1. Adds a date field to all existing status records that don't have one
 * 2. Derives the date from changedAt timestamp (ISO date portion)
 * 3. Is idempotent - safe to run multiple times
 *
 * Rollback: Set date field to undefined for all records (optional)
 */
export const addDateToStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const startTime = Date.now();
    const results = {
      totalStatuses: 0,
      statusesWithoutDate: 0,
      statusesUpdated: 0,
      errors: [] as string[],
    };

    try {
      // Get all individual process statuses
      const statuses = await ctx.db.query("individualProcessStatuses").collect();
      results.totalStatuses = statuses.length;

      console.log(`Processing ${statuses.length} status records...`);

      // Update each status record that doesn't have a date
      for (const status of statuses) {
        try {
          // Skip if date already exists
          if (status.date) {
            continue;
          }

          results.statusesWithoutDate++;

          // Convert changedAt timestamp to ISO date string (YYYY-MM-DD)
          const dateObj = new Date(status.changedAt);
          const isoDate = dateObj.toISOString().split('T')[0];

          // Update the status record with the date
          await ctx.db.patch(status._id, {
            date: isoDate,
          });

          results.statusesUpdated++;
        } catch (error) {
          results.errors.push(
            `Failed to update status ${status._id}: ${error}`
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(`Migration completed in ${duration}ms`);

      return {
        success: true,
        duration,
        ...results,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        ...results,
      };
    }
  },
});

/**
 * Verification function to check migration status
 */
export const verifyDateMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    const statuses = await ctx.db.query("individualProcessStatuses").collect();

    const stats = {
      totalStatuses: statuses.length,
      statusesWithDate: 0,
      statusesWithoutDate: 0,
      statusesWithInvalidDate: [] as string[],
    };

    // Validate date format for all status records
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    for (const status of statuses) {
      if (status.date) {
        stats.statusesWithDate++;

        // Validate date format
        if (!dateRegex.test(status.date)) {
          stats.statusesWithInvalidDate.push(status._id);
        }

        // Validate it's a valid date
        const dateObj = new Date(status.date);
        if (isNaN(dateObj.getTime())) {
          stats.statusesWithInvalidDate.push(status._id);
        }
      } else {
        stats.statusesWithoutDate++;
      }
    }

    return {
      ...stats,
      migrationComplete: stats.statusesWithoutDate === 0 &&
                        stats.statusesWithInvalidDate.length === 0,
    };
  },
});

/**
 * Rollback migration - removes date field from all status records
 * WARNING: This will delete all date data!
 */
export const rollbackDateMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      statusesProcessed: 0,
      statusesCleared: 0,
    };

    try {
      // Get all status records
      const statuses = await ctx.db.query("individualProcessStatuses").collect();

      for (const status of statuses) {
        results.statusesProcessed++;

        if (status.date) {
          await ctx.db.patch(status._id, {
            date: undefined,
          });
          results.statusesCleared++;
        }
      }

      return {
        success: true,
        message: "Rollback completed successfully",
        ...results,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        ...results,
      };
    }
  },
});
