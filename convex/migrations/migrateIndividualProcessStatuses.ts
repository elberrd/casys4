import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Migration to convert individual process status from string field to many-to-many relationship
 *
 * This migration:
 * 1. Creates status records for all individual processes with current status
 * 2. Creates historical status records from processHistory table
 * 3. Links processHistory records to new status records
 *
 * Rollback: Delete all records from individualProcessStatuses table and clear
 * previousStatusId/newStatusId fields from processHistory
 */
export const migrateToStatusRelationship = internalMutation({
  args: {},
  handler: async (ctx) => {
    const startTime = Date.now();
    const results = {
      totalProcesses: 0,
      processesWithStatus: 0,
      statusRecordsCreated: 0,
      historicalRecordsCreated: 0,
      historyRecordsUpdated: 0,
      errors: [] as string[],
    };

    try {
      // Get all individual processes
      const processes = await ctx.db.query("individualProcesses").collect();
      results.totalProcesses = processes.length;

      // Get system user (for historical records without a user)
      // Find an admin user by checking userProfiles
      const adminProfiles = await ctx.db.query("userProfiles").collect();
      const adminProfile = adminProfiles.find(p => p.role === "admin");

      let systemUserId: Id<"users">;
      if (adminProfile) {
        systemUserId = adminProfile.userId;
      } else {
        // Fallback to first user if no admin found
        const users = await ctx.db.query("users").first();
        if (!users) {
          throw new Error("No users found in database. Cannot proceed with migration.");
        }
        systemUserId = users._id;
      }

      // Step 1: Create current status records for all processes
      console.log("Step 1: Creating current status records...");
      for (const process of processes) {
        try {
          if (process.status) {
            // Check if status record already exists (in case migration is run multiple times)
            const existingStatus = await ctx.db
              .query("individualProcessStatuses")
              .withIndex("by_individualProcess_active", (q) =>
                q.eq("individualProcessId", process._id).eq("isActive", true)
              )
              .first();

            if (!existingStatus) {
              // Create active status record
              await ctx.db.insert("individualProcessStatuses", {
                individualProcessId: process._id,
                statusName: process.status,
                isActive: true,
                notes: "Migrated from legacy status field",
                changedBy: systemUserId,
                changedAt: process.updatedAt || process.createdAt,
                createdAt: process.updatedAt || process.createdAt,
              });
              results.statusRecordsCreated++;
            }
            results.processesWithStatus++;
          }
        } catch (error) {
          results.errors.push(
            `Failed to create status for process ${process._id}: ${error}`
          );
        }
      }

      // Step 2: Create historical status records from processHistory
      console.log("Step 2: Creating historical status records...");
      const historyRecords = await ctx.db
        .query("processHistory")
        .withIndex("by_changedAt")
        .order("asc")
        .collect();

      // Group history by process to maintain chronological order
      const historyByProcess = new Map<
        Id<"individualProcesses">,
        typeof historyRecords
      >();

      for (const history of historyRecords) {
        if (!historyByProcess.has(history.individualProcessId)) {
          historyByProcess.set(history.individualProcessId, []);
        }
        historyByProcess.get(history.individualProcessId)!.push(history);
      }

      // Process each individual process's history
      for (const [processId, histories] of historyByProcess.entries()) {
        try {
          // Sort by date to ensure chronological order
          histories.sort((a, b) => a.changedAt - b.changedAt);

          for (const history of histories) {
            // Skip if already migrated
            if (history.newStatusId) {
              continue;
            }

            // Create status record for this historical change
            const statusId = await ctx.db.insert("individualProcessStatuses", {
              individualProcessId: processId,
              statusName: history.newStatus,
              isActive: false, // Historical records are not active
              notes: history.notes || "Historical status from migration",
              changedBy: history.changedBy,
              changedAt: history.changedAt,
              createdAt: history.changedAt,
            });
            results.historicalRecordsCreated++;

            // Update history record to reference new status record
            await ctx.db.patch(history._id, {
              newStatusId: statusId,
            });
            results.historyRecordsUpdated++;
          }
        } catch (error) {
          results.errors.push(
            `Failed to create historical statuses for process ${processId}: ${error}`
          );
        }
      }

      // Step 3: Final validation - ensure only one active status per process
      console.log("Step 3: Validating single active status constraint...");
      for (const process of processes) {
        const activeStatuses = await ctx.db
          .query("individualProcessStatuses")
          .withIndex("by_individualProcess_active", (q) =>
            q.eq("individualProcessId", process._id).eq("isActive", true)
          )
          .collect();

        if (activeStatuses.length > 1) {
          // Keep the most recent one, deactivate others
          activeStatuses.sort((a, b) => b.changedAt - a.changedAt);
          for (let i = 1; i < activeStatuses.length; i++) {
            await ctx.db.patch(activeStatuses[i]._id, { isActive: false });
          }
          results.errors.push(
            `Process ${process._id} had multiple active statuses. Kept most recent.`
          );
        } else if (activeStatuses.length === 0 && process.status) {
          results.errors.push(
            `Process ${process._id} has status but no active status record was created.`
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
 * Rollback migration - removes all status records and clears references in processHistory
 * WARNING: This will delete all status history data!
 */
export const rollbackStatusMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      statusRecordsDeleted: 0,
      historyRecordsCleared: 0,
    };

    try {
      // Delete all status records
      const statuses = await ctx.db.query("individualProcessStatuses").collect();
      for (const status of statuses) {
        await ctx.db.delete(status._id);
        results.statusRecordsDeleted++;
      }

      // Clear status references in processHistory
      const histories = await ctx.db.query("processHistory").collect();
      for (const history of histories) {
        if (history.newStatusId || history.previousStatusId) {
          await ctx.db.patch(history._id, {
            newStatusId: undefined,
            previousStatusId: undefined,
          });
          results.historyRecordsCleared++;
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

/**
 * Verification function to check migration status
 */
export const verifyStatusMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    const processes = await ctx.db.query("individualProcesses").collect();
    const statuses = await ctx.db.query("individualProcessStatuses").collect();

    const stats = {
      totalProcesses: processes.length,
      processesWithOldStatus: 0,
      totalStatusRecords: statuses.length,
      activeStatusRecords: 0,
      inactiveStatusRecords: 0,
      processesWithMultipleActiveStatuses: [] as string[],
      processesWithoutActiveStatus: [] as string[],
    };

    // Count processes with old status field
    for (const process of processes) {
      if (process.status) {
        stats.processesWithOldStatus++;
      }
    }

    // Count active/inactive statuses
    for (const status of statuses) {
      if (status.isActive) {
        stats.activeStatusRecords++;
      } else {
        stats.inactiveStatusRecords++;
      }
    }

    // Check for constraint violations
    for (const process of processes) {
      const activeStatuses = await ctx.db
        .query("individualProcessStatuses")
        .withIndex("by_individualProcess_active", (q) =>
          q.eq("individualProcessId", process._id).eq("isActive", true)
        )
        .collect();

      if (activeStatuses.length > 1) {
        stats.processesWithMultipleActiveStatuses.push(process._id);
      } else if (activeStatuses.length === 0 && process.status) {
        stats.processesWithoutActiveStatus.push(process._id);
      }
    }

    return {
      ...stats,
      migrationComplete: stats.processesWithoutActiveStatus.length === 0 &&
                        stats.processesWithMultipleActiveStatuses.length === 0,
    };
  },
});
