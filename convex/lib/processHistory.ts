import { getAuthUserId } from "@convex-dev/auth/server";
import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Helper function to log status changes to process history
 * This ensures consistent history logging across all mutations
 *
 * @param ctx - Mutation context
 * @param individualProcessId - The individual process being updated
 * @param previousStatus - The status before the change (undefined for new processes)
 * @param newStatus - The new status being set
 * @param notes - Optional notes explaining the change
 * @param metadata - Optional metadata (JSON object) for additional context
 * @param previousStatusId - Optional: ID of the previous status record
 * @param newStatusId - Optional: ID of the new status record
 * @returns The ID of the created history record
 */
export async function logStatusChange(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
  previousStatus: string | undefined,
  newStatus: string,
  notes?: string,
  metadata?: any,
  previousStatusId?: Id<"individualProcessStatuses">,
  newStatusId?: Id<"individualProcessStatuses">,
): Promise<Id<"processHistory">> {
  // Get current user ID from auth session
  const userId = await getAuthUserId(ctx);

  if (userId === null) {
    throw new Error("Not authenticated");
  }

  // Create history record with both old and new system references
  const historyId = await ctx.db.insert("processHistory", {
    individualProcessId,
    previousStatus, // Backward compatibility
    newStatus, // Backward compatibility
    previousStatusId, // New system
    newStatusId, // New system
    changedBy: userId,
    changedAt: Date.now(),
    notes,
    metadata,
  });

  return historyId;
}
