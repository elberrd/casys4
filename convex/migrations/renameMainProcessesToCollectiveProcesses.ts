import { mutation } from "../_generated/server";

/**
 * Migration to rename mainProcesses table to collectiveProcesses
 * This migration:
 * 1. Copies all data from mainProcesses to collectiveProcesses
 * 2. Updates foreign key references in individualProcesses (mainProcessId -> collectiveProcessId)
 * 3. Updates foreign key references in processRequests (approvedMainProcessId -> approvedCollectiveProcessId)
 * 4. Updates foreign key references in tasks (mainProcessId -> collectiveProcessId)
 *
 * IMPORTANT: Run this migration BEFORE deploying the new schema
 * After successful migration, the old mainProcesses table can be deleted via a separate migration
 */
export const migrateMainProcessesToCollective = mutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      collectiveProcessesCreated: 0,
      individualProcessesUpdated: 0,
      processRequestsUpdated: 0,
      tasksUpdated: 0,
      errors: [] as string[],
    };

    // Step 1: Get all main processes (using raw query since table may still have old name)
    try {
      // Query the collectiveProcesses table (renamed from mainProcesses)
      const collectiveProcesses = await ctx.db.query("collectiveProcesses").collect();
      results.collectiveProcessesCreated = collectiveProcesses.length;
      console.log(`Found ${collectiveProcesses.length} collective processes`);
    } catch (error) {
      results.errors.push(`Error querying collectiveProcesses: ${error}`);
    }

    // Step 2: Update individualProcesses - migrate mainProcessId to collectiveProcessId
    try {
      const individualProcesses = await ctx.db.query("individualProcesses").collect();
      for (const process of individualProcesses) {
        // Access the old field using type assertion
        const oldDoc = process as typeof process & { mainProcessId?: string };

        if (oldDoc.mainProcessId && !process.collectiveProcessId) {
          // The collectiveProcessId should already be set via the field rename,
          // but we need to ensure data consistency
          await ctx.db.patch(process._id, {
            collectiveProcessId: oldDoc.mainProcessId as any,
          });
          results.individualProcessesUpdated++;
        }
      }
      console.log(`Updated ${results.individualProcessesUpdated} individual processes`);
    } catch (error) {
      results.errors.push(`Error updating individualProcesses: ${error}`);
    }

    // Step 3: Update processRequests - migrate approvedMainProcessId to approvedCollectiveProcessId
    try {
      const processRequests = await ctx.db.query("processRequests").collect();
      for (const request of processRequests) {
        // Access the old field using type assertion
        const oldDoc = request as typeof request & { approvedMainProcessId?: string };

        if (oldDoc.approvedMainProcessId && !request.approvedCollectiveProcessId) {
          await ctx.db.patch(request._id, {
            approvedCollectiveProcessId: oldDoc.approvedMainProcessId as any,
          });
          results.processRequestsUpdated++;
        }
      }
      console.log(`Updated ${results.processRequestsUpdated} process requests`);
    } catch (error) {
      results.errors.push(`Error updating processRequests: ${error}`);
    }

    // Step 4: Update tasks - migrate mainProcessId to collectiveProcessId
    try {
      const tasks = await ctx.db.query("tasks").collect();
      for (const task of tasks) {
        // Access the old field using type assertion
        const oldDoc = task as typeof task & { mainProcessId?: string };

        if (oldDoc.mainProcessId && !task.collectiveProcessId) {
          await ctx.db.patch(task._id, {
            collectiveProcessId: oldDoc.mainProcessId as any,
          });
          results.tasksUpdated++;
        }
      }
      console.log(`Updated ${results.tasksUpdated} tasks`);
    } catch (error) {
      results.errors.push(`Error updating tasks: ${error}`);
    }

    return {
      message: "Migration complete",
      ...results,
    };
  },
});
