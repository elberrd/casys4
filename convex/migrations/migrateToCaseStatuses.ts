/**
 * Migration Script: Migrate to Case Status System
 *
 * This migration transforms the system from hardcoded status strings to the new
 * Case Status system with proper referential integrity.
 *
 * Features:
 * - Idempotent (safe to run multiple times)
 * - Progress logging
 * - Maintains backward compatibility
 * - Preserves audit trail
 *
 * Usage:
 * Run this as an internal mutation from Convex dashboard or via CLI
 */

import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

// Status mapping from old status strings to case status codes
const STATUS_MAPPING: Record<string, string> = {
  // Preparation statuses
  "pending_documents": "em_preparacao",
  "pending": "em_preparacao",
  "draft": "em_preparacao",
  "preparation": "em_preparacao",

  // In Progress statuses
  "in_progress": "em_tramite",
  "processing": "em_tramite",
  "submitted": "aguardando_publicacao",
  "awaiting_publication": "aguardando_publicacao",

  // Review statuses
  "under_review": "em_analise",
  "review": "em_analise",

  // Approved statuses
  "approved": "deferido",
  "granted": "deferido",
  "completed": "deferido",

  // Cancelled statuses
  "cancelled": "cancelado",
  "rejected": "indeferido",
  "denied": "indeferido",

  // Default fallback
  "_default": "em_preparacao",
};

export default internalMutation({
  handler: async (ctx) => {
    console.log("=== Starting Migration to Case Status System ===");

    const startTime = Date.now();
    const results = {
      caseStatusesCreated: 0,
      caseStatusesSkipped: 0,
      individualProcessesUpdated: 0,
      individualProcessesSkipped: 0,
      statusHistoryUpdated: 0,
      statusHistorySkipped: 0,
      collectiveProcessesArchived: 0,
      errors: [] as string[],
    };

    try {
      // ========================================
      // STEP 1: Create Case Statuses
      // ========================================
      console.log("\nStep 1: Creating case statuses...");

      try {
        const seedResult = await ctx.runMutation(internal.seedCaseStatuses.default);
        results.caseStatusesCreated = seedResult.inserted;
        results.caseStatusesSkipped = seedResult.skipped;
        console.log(`  ✓ Case statuses: ${seedResult.inserted} created, ${seedResult.skipped} already existed`);
      } catch (error) {
        const errorMsg = `Failed to seed case statuses: ${error}`;
        results.errors.push(errorMsg);
        console.error(`  ✗ ${errorMsg}`);
        throw error; // Stop migration if case statuses can't be created
      }

      // ========================================
      // STEP 2: Build Status Mapping
      // ========================================
      console.log("\nStep 2: Building status mapping...");

      const caseStatuses = await ctx.db.query("caseStatuses").collect();
      const codeToIdMap = new Map<string, string>();

      for (const caseStatus of caseStatuses) {
        codeToIdMap.set(caseStatus.code, caseStatus._id);
      }

      console.log(`  ✓ Built mapping for ${codeToIdMap.size} case statuses`);

      // Helper function to map status string to case status ID
      const mapStatusToId = (statusString: string | undefined): string | null => {
        if (!statusString) return codeToIdMap.get("em_preparacao") || null;

        // Try direct mapping first
        const mappedCode = STATUS_MAPPING[statusString.toLowerCase()];
        if (mappedCode && codeToIdMap.has(mappedCode)) {
          return codeToIdMap.get(mappedCode) || null;
        }

        // Try to find by exact code match
        if (codeToIdMap.has(statusString.toLowerCase())) {
          return codeToIdMap.get(statusString.toLowerCase()) || null;
        }

        // Fallback to default
        return codeToIdMap.get("em_preparacao") || null;
      };

      // ========================================
      // STEP 3: Update Individual Processes
      // ========================================
      console.log("\nStep 3: Updating individual processes...");

      const individualProcesses = await ctx.db.query("individualProcesses").collect();
      console.log(`  Found ${individualProcesses.length} individual processes`);

      let processUpdateCount = 0;
      for (const process of individualProcesses) {
        // Skip if already has caseStatusId
        if (process.caseStatusId) {
          results.individualProcessesSkipped++;
          continue;
        }

        const caseStatusId = mapStatusToId(process.status);
        if (caseStatusId) {
          try {
            await ctx.db.patch(process._id, {
              caseStatusId: caseStatusId as any,
              updatedAt: Date.now(),
            });
            results.individualProcessesUpdated++;
            processUpdateCount++;

            // Log progress every 100 records
            if (processUpdateCount % 100 === 0) {
              console.log(`  Progress: ${processUpdateCount} processes updated...`);
            }
          } catch (error) {
            const errorMsg = `Failed to update individual process ${process._id}: ${error}`;
            results.errors.push(errorMsg);
            console.error(`  ✗ ${errorMsg}`);
          }
        } else {
          const errorMsg = `No case status found for individual process ${process._id} with status "${process.status}"`;
          results.errors.push(errorMsg);
          console.warn(`  ⚠ ${errorMsg}`);
        }
      }

      console.log(`  ✓ Updated ${results.individualProcessesUpdated} individual processes`);
      console.log(`  ℹ Skipped ${results.individualProcessesSkipped} (already migrated)`);

      // ========================================
      // STEP 4: Update Individual Process Statuses
      // ========================================
      console.log("\nStep 4: Updating individual process status history...");

      const statusRecords = await ctx.db.query("individualProcessStatuses").collect();
      console.log(`  Found ${statusRecords.length} status history records`);

      let statusUpdateCount = 0;
      for (const statusRecord of statusRecords) {
        // Skip if already has caseStatusId
        if (statusRecord.caseStatusId) {
          results.statusHistorySkipped++;
          continue;
        }

        const caseStatusId = mapStatusToId(statusRecord.statusName);
        if (caseStatusId) {
          try {
            await ctx.db.patch(statusRecord._id, {
              caseStatusId: caseStatusId as any,
            });
            results.statusHistoryUpdated++;
            statusUpdateCount++;

            // Log progress every 100 records
            if (statusUpdateCount % 100 === 0) {
              console.log(`  Progress: ${statusUpdateCount} status records updated...`);
            }
          } catch (error) {
            const errorMsg = `Failed to update status record ${statusRecord._id}: ${error}`;
            results.errors.push(errorMsg);
            console.error(`  ✗ ${errorMsg}`);
          }
        } else {
          const errorMsg = `No case status found for status record ${statusRecord._id} with status "${statusRecord.statusName}"`;
          results.errors.push(errorMsg);
          console.warn(`  ⚠ ${errorMsg}`);
        }
      }

      console.log(`  ✓ Updated ${results.statusHistoryUpdated} status history records`);
      console.log(`  ℹ Skipped ${results.statusHistorySkipped} (already migrated)`);

      // ========================================
      // STEP 5: Archive Collective Process Statuses
      // ========================================
      console.log("\nStep 5: Archiving collective process statuses to activity logs...");

      const collectiveProcesses = await ctx.db.query("collectiveProcesses").collect();
      console.log(`  Found ${collectiveProcesses.length} collective processes`);

      for (const collectiveProcess of collectiveProcesses) {
        if (collectiveProcess.status) {
          try {
            // Archive to activity logs for audit trail
            await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
              userId: "migration" as any, // System migration user
              action: "migration_archived",
              entityType: "collectiveProcess",
              entityId: collectiveProcess._id,
              details: {
                archivedStatus: collectiveProcess.status,
                archivedCompletedAt: collectiveProcess.completedAt,
                referenceNumber: collectiveProcess.referenceNumber,
                migratedAt: Date.now(),
                note: "Collective process status archived during migration to calculated status system",
              },
            });
            results.collectiveProcessesArchived++;
          } catch (error) {
            const errorMsg = `Failed to archive collective process ${collectiveProcess._id}: ${error}`;
            results.errors.push(errorMsg);
            console.error(`  ✗ ${errorMsg}`);
          }
        }
      }

      console.log(`  ✓ Archived ${results.collectiveProcessesArchived} collective process statuses`);

      // ========================================
      // STEP 6: Optional - Clear Status Fields
      // ========================================
      console.log("\nStep 6: Keeping status fields for backward compatibility...");
      console.log("  ℹ Status fields are marked as DEPRECATED but kept for rollback safety");
      console.log("  ℹ They can be removed in a future migration after verification");

    } catch (error) {
      console.error("\n✗ Migration failed with error:", error);
      throw error;
    }

    // ========================================
    // Summary
    // ========================================
    const duration = Date.now() - startTime;
    console.log("\n=== Migration Complete ===");
    console.log(`Duration: ${duration}ms`);
    console.log("\nResults:");
    console.log(`  Case Statuses: ${results.caseStatusesCreated} created, ${results.caseStatusesSkipped} existed`);
    console.log(`  Individual Processes: ${results.individualProcessesUpdated} updated, ${results.individualProcessesSkipped} skipped`);
    console.log(`  Status History: ${results.statusHistoryUpdated} updated, ${results.statusHistorySkipped} skipped`);
    console.log(`  Collective Processes: ${results.collectiveProcessesArchived} archived`);

    if (results.errors.length > 0) {
      console.log(`\n⚠ Errors: ${results.errors.length}`);
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log("\n✓ No errors");
    }

    return results;
  },
});
