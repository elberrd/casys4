import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Ensures only one status is active for an individual process
 * Deactivates all other statuses when marking a new one as active
 *
 * @param ctx - Convex mutation context
 * @param individualProcessId - The ID of the individual process
 * @param newStatusId - The ID of the status to mark as active
 */
export async function ensureSingleActiveStatus(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
  newStatusId: Id<"individualProcessStatuses">
): Promise<void> {
  // Query all active statuses for this individual process
  const activeStatuses = await ctx.db
    .query("individualProcessStatuses")
    .withIndex("by_individualProcess_active", (q) =>
      q.eq("individualProcessId", individualProcessId).eq("isActive", true)
    )
    .collect();

  // Deactivate all statuses except the new one
  for (const status of activeStatuses) {
    if (status._id !== newStatusId) {
      await ctx.db.patch(status._id, { isActive: false });
    }
  }
}
