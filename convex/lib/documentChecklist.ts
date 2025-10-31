import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Helper function to generate document checklist for an individual process
 * Creates documentsDelivered records based on the matching document template
 */
export async function generateDocumentChecklist(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
): Promise<Id<"documentsDelivered">[]> {
  // Get the individual process
  const individualProcess = await ctx.db.get(individualProcessId);
  if (!individualProcess) {
    throw new Error("Individual process not found");
  }

  // Get the main process to find the process type
  const mainProcess = await ctx.db.get(individualProcess.mainProcessId);
  if (!mainProcess) {
    throw new Error("Main process not found");
  }

  // Find matching document template
  // Match by processType and legalFramework (if specified)
  if (!mainProcess.processTypeId) {
    // Cannot generate checklist without processTypeId
    return [];
  }

  const processTypeId = mainProcess.processTypeId;
  const templates = await ctx.db
    .query("documentTemplates")
    .withIndex("by_processType", (q) =>
      q.eq("processTypeId", processTypeId),
    )
    .collect();

  // Filter by legalFramework and isActive
  const matchingTemplates = templates.filter((t) => {
    if (!t.isActive) return false;
    if (!individualProcess.legalFrameworkId && !t.legalFrameworkId) return true;
    return t.legalFrameworkId === individualProcess.legalFrameworkId;
  });

  if (matchingTemplates.length === 0) {
    // No template found - this is okay, just return empty array
    console.log(
      `No matching document template found for processType ${mainProcess.processTypeId} and legalFramework ${individualProcess.legalFrameworkId}`,
    );
    return [];
  }

  // Use the first matching template (could be enhanced to use highest version)
  const template = matchingTemplates.sort((a, b) => b.version - a.version)[0];

  // Get all document requirements for this template
  const requirements = await ctx.db
    .query("documentRequirements")
    .withIndex("by_template", (q) => q.eq("templateId", template._id))
    .collect();

  // Create documentsDelivered records for each requirement
  const createdDocumentIds: Id<"documentsDelivered">[] = [];

  // Get current user to set as uploader (will be admin who created the process)
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  for (const requirement of requirements) {
    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: individualProcessId,
      documentTypeId: requirement.documentTypeId,
      documentRequirementId: requirement._id,
      personId: individualProcess.personId,
      companyId: mainProcess.companyId,
      fileName: "",
      fileUrl: "",
      fileSize: 0,
      mimeType: "",
      status: "not_started",
      uploadedBy: userId,
      uploadedAt: Date.now(),
      version: 1,
      isLatest: true,
    });

    createdDocumentIds.push(documentId);
  }

  return createdDocumentIds;
}
