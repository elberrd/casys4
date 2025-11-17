import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Finds the "em preparação" status entry for a given individual process
 *
 * @param ctx - Convex query or mutation context
 * @param individualProcessId - The ID of the individual process
 * @returns The "em preparação" status record or null if not found
 */
export async function getEmPreparacaoStatus(
  ctx: QueryCtx | MutationCtx,
  individualProcessId: Id<"individualProcesses">
): Promise<{ _id: Id<"individualProcessStatuses">; date?: string } | null> {
  // First, find the "em preparação" case status
  const emPreparacaoStatus = await ctx.db
    .query("caseStatuses")
    .filter((q) => q.eq(q.field("code"), "em_preparacao"))
    .first();

  if (!emPreparacaoStatus) {
    return null;
  }

  // Find the individual process status record that matches
  const individualStatus = await ctx.db
    .query("individualProcessStatuses")
    .withIndex("by_individualProcess", (q) =>
      q.eq("individualProcessId", individualProcessId)
    )
    .filter((q) => q.eq(q.field("caseStatusId"), emPreparacaoStatus._id))
    .first();

  if (!individualStatus) {
    return null;
  }

  return {
    _id: individualStatus._id,
    date: individualStatus.date,
  };
}

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
