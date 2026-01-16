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
  if (!individualProcess.collectiveProcessId) {
    throw new Error("Individual process has no main process");
  }

  const collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
  if (!collectiveProcess) {
    throw new Error("Main process not found");
  }

  // Find matching document template
  // Match by processType and legalFramework (if specified)
  if (!collectiveProcess.processTypeId) {
    // Cannot generate checklist without processTypeId
    return [];
  }

  const processTypeId = collectiveProcess.processTypeId;
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
      `No matching document template found for processType ${collectiveProcess.processTypeId} and legalFramework ${individualProcess.legalFrameworkId}`,
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
      companyId: collectiveProcess.companyId,
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

/**
 * Helper function to generate document checklist based on legal framework associations
 * Creates documentsDelivered records based on documentTypesLegalFrameworks
 * This is the new approach that auto-populates documents based on the process's legal framework
 */
export async function generateDocumentChecklistByLegalFramework(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
): Promise<Id<"documentsDelivered">[]> {
  // Get the individual process
  const individualProcess = await ctx.db.get(individualProcessId);
  if (!individualProcess) {
    throw new Error("Individual process not found");
  }

  // Must have a legal framework to generate documents
  if (!individualProcess.legalFrameworkId) {
    console.log(
      `No legal framework assigned to individual process ${individualProcessId}`,
    );
    return [];
  }

  const legalFrameworkId = individualProcess.legalFrameworkId;

  // Get the main process to get company ID
  const collectiveProcess = individualProcess.collectiveProcessId
    ? await ctx.db.get(individualProcess.collectiveProcessId)
    : null;

  // Get all document type associations for this legal framework
  const associations = await ctx.db
    .query("documentTypesLegalFrameworks")
    .withIndex("by_legalFramework", (q) =>
      q.eq("legalFrameworkId", legalFrameworkId),
    )
    .collect();

  if (associations.length === 0) {
    console.log(
      `No document types associated with legal framework ${legalFrameworkId}`,
    );
    return [];
  }

  // Get current user
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  // Create documentsDelivered records for each association
  const createdDocumentIds: Id<"documentsDelivered">[] = [];

  for (const assoc of associations) {
    // Check if document type is still active
    const documentType = await ctx.db.get(assoc.documentTypeId);
    if (!documentType || !documentType.isActive) {
      continue;
    }

    // Check if document already exists for this process and type
    const existingDocs = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", individualProcessId),
      )
      .collect();

    const alreadyExists = existingDocs.some(
      (doc) =>
        doc.documentTypeId === assoc.documentTypeId &&
        doc.documentTypeLegalFrameworkId === assoc._id &&
        doc.isLatest,
    );

    if (alreadyExists) {
      continue;
    }

    // Create pending document record
    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: individualProcessId,
      documentTypeId: assoc.documentTypeId,
      documentTypeLegalFrameworkId: assoc._id,
      isRequired: assoc.isRequired,
      personId: individualProcess.personId,
      companyId: collectiveProcess?.companyId,
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

/**
 * Helper function to regenerate document checklist when legal framework changes
 * Removes old pending documents and creates new ones based on new legal framework
 */
export async function regenerateDocumentChecklistForLegalFramework(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
): Promise<Id<"documentsDelivered">[]> {
  // Get current pending documents (status = not_started) that were auto-generated
  const existingDocs = await ctx.db
    .query("documentsDelivered")
    .withIndex("by_individualProcess", (q) =>
      q.eq("individualProcessId", individualProcessId),
    )
    .collect();

  // Remove pending auto-generated documents (those with documentTypeLegalFrameworkId)
  const pendingAutoGenerated = existingDocs.filter(
    (doc) =>
      doc.status === "not_started" &&
      doc.documentTypeLegalFrameworkId &&
      doc.isLatest,
  );

  for (const doc of pendingAutoGenerated) {
    await ctx.db.delete(doc._id);
  }

  // Generate new checklist based on current legal framework
  return await generateDocumentChecklistByLegalFramework(ctx, individualProcessId);
}
