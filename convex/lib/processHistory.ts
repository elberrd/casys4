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
 * @returns The ID of the created history record
 */
export async function logStatusChange(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
  previousStatus: string | undefined,
  newStatus: string,
  notes?: string,
  metadata?: any,
): Promise<Id<"processHistory">> {
  // Get current user ID from auth session
  const userId = await getAuthUserId(ctx);

  if (userId === null) {
    throw new Error("Not authenticated");
  }

  // Create history record
  const historyId = await ctx.db.insert("processHistory", {
    individualProcessId,
    previousStatus,
    newStatus,
    changedBy: userId,
    changedAt: Date.now(),
    notes,
    metadata,
  });

  return historyId;
}
