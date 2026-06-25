import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  generateDocumentChecklist,
  generateDocumentChecklistByLegalFramework,
  autoReuseCompanyDocuments,
} from "./documentChecklist";
import { logStatusChange } from "./processHistory";
import { normalizeStatusDateTime } from "./statusDateTime";

function getFullName(person: {
  givenNames: string;
  middleName?: string;
  surname?: string;
}): string {
  return [person.givenNames, person.middleName, person.surname]
    .filter(Boolean)
    .join(" ");
}

/**
 * Run every "process creation" side effect on an EXISTING individualProcesses
 * row: resolve + persist the initial case status, create the active status
 * record, log the status to history, generate the document checklists, auto-reuse
 * company documents, and log the activity.
 *
 * This is the moment a process "becomes real". It is invoked by the
 * process-request finalize mutation (and the data migration) when a client's
 * "draft" requested process becomes "solicitado" — the row already exists, so
 * only the side effects run here (no insert, no data copy). `userId` is threaded
 * explicitly so it works without an ambient auth session (e.g. migrations).
 *
 * If the row already carries a `caseStatusId` it is honored; otherwise the
 * default "em_preparacao" status is resolved and persisted onto the row.
 */
export async function runProcessCreationSideEffects(
  ctx: MutationCtx,
  processId: Id<"individualProcesses">,
  userId: Id<"users">
): Promise<void> {
  const now = Date.now();

  const process = await ctx.db.get(processId);
  if (!process) {
    throw new Error("Individual process not found");
  }

  // Resolve the case status: honor an existing one, else default to em_preparacao.
  let caseStatus = process.caseStatusId
    ? await ctx.db.get(process.caseStatusId)
    : null;
  if (!caseStatus) {
    caseStatus = await ctx.db
      .query("caseStatuses")
      .withIndex("by_code", (q) => q.eq("code", "em_preparacao"))
      .first();
    if (!caseStatus) {
      throw new Error("Default status 'em_preparacao' not found in database");
    }
  }

  const statusString = process.status || caseStatus.code;

  // Persist the resolved status onto the row (drafts have none yet).
  await ctx.db.patch(processId, {
    caseStatusId: caseStatus._id,
    status: statusString,
    updatedAt: now,
  });

  // Create initial status record in the status system with the process date.
  try {
    const statusDate = normalizeStatusDateTime(process.dateProcess, now);
    await ctx.db.insert("individualProcessStatuses", {
      individualProcessId: processId,
      caseStatusId: caseStatus._id,
      statusName: caseStatus.name,
      date: statusDate,
      isActive: true,
      notes: `Initial status: ${caseStatus.name}`,
      changedBy: userId,
      changedAt: now,
      createdAt: now,
    });
  } catch (error) {
    console.error("Failed to create initial status record:", error);
  }

  // Log initial status to history. `userId` is threaded explicitly so this
  // works in contexts without an ambient auth session (e.g. the migration).
  try {
    await logStatusChange(
      ctx,
      processId,
      undefined,
      caseStatus.name,
      `Individual process created with status: ${caseStatus.name}`,
      undefined,
      undefined,
      undefined,
      userId
    );
  } catch (error) {
    console.error("Failed to log initial status to history:", error);
  }

  // Auto-generate document checklist (template-based)
  try {
    await generateDocumentChecklist(ctx, processId, userId);
  } catch (error) {
    console.error("Failed to generate document checklist:", error);
  }

  // Auto-generate document checklist based on legal framework associations
  try {
    await generateDocumentChecklistByLegalFramework(ctx, processId, userId);
  } catch (error) {
    console.error(
      "Failed to generate document checklist by legal framework:",
      error
    );
  }

  // Auto-reuse company documents from other processes of the same company
  if (process.companyApplicantId) {
    try {
      await autoReuseCompanyDocuments(ctx, processId, userId);
    } catch (error) {
      console.error("Failed to auto-reuse company documents:", error);
    }
  }

  // Log activity (non-blocking)
  try {
    const [person, collectiveProcess] = await Promise.all([
      ctx.db.get(process.personId),
      process.collectiveProcessId
        ? ctx.db.get(process.collectiveProcessId)
        : Promise.resolve(null),
    ]);

    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId,
      action: "created",
      entityType: "individualProcess",
      entityId: processId,
      details: {
        personName: person ? getFullName(person) : undefined,
        collectiveProcessReference: collectiveProcess?.referenceNumber,
        caseStatusName: caseStatus.name,
        caseStatusId: caseStatus._id,
        legalFrameworkId: process.legalFrameworkId,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
