import { Doc } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

/**
 * Captures the process progress as denormalized data for a document version.
 *
 * The snapshot is written only by version-submission mutations and is never
 * accepted as a client argument. This keeps the recorded progress immutable
 * even when the active status entry or the case-status catalog changes later.
 */
export async function getProcessStatusAtUpload(
  ctx: MutationCtx,
  individualProcess: Doc<"individualProcesses">
): Promise<Doc<"documentsDelivered">["processStatusAtUpload"]> {
  const activeStatus = await ctx.db
    .query("individualProcessStatuses")
    .withIndex("by_individualProcess_active", (q) =>
      q.eq("individualProcessId", individualProcess._id).eq("isActive", true)
    )
    .order("desc")
    .first();

  // Legacy processes may have no active flag even though they have history.
  // In that case, use the most recent dated progress entry.
  const latestStatus = activeStatus ?? await ctx.db
    .query("individualProcessStatuses")
    .withIndex("by_individualProcess_date", (q) =>
      q.eq("individualProcessId", individualProcess._id)
    )
    .order("desc")
    .first();

  const caseStatusId = latestStatus?.caseStatusId ?? individualProcess.caseStatusId;
  const caseStatus = caseStatusId ? await ctx.db.get(caseStatusId) : null;
  const legacyName = latestStatus?.statusName ?? individualProcess.status;

  if (!caseStatus && !legacyName) {
    return undefined;
  }

  return {
    individualProcessStatusId: latestStatus?._id,
    caseStatusId,
    name: caseStatus?.name ?? legacyName!,
    nameEn: caseStatus?.nameEn,
    code: caseStatus?.code ?? individualProcess.status ?? legacyName!,
    color: caseStatus?.color,
    category: caseStatus?.category,
  };
}
