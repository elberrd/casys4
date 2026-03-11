import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
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
  const collectiveProcess = individualProcess.collectiveProcessId
    ? await ctx.db.get(individualProcess.collectiveProcessId)
    : null;

  // Find matching document template
  // Match by processType and legalFramework (if specified)
  if (!collectiveProcess?.processTypeId) {
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

  // Get existing documents for this process to prevent duplicates
  const existingDocs = await ctx.db
    .query("documentsDelivered")
    .withIndex("by_individualProcess", (q) =>
      q.eq("individualProcessId", individualProcessId),
    )
    .collect();
  const existingDocTypeIds = new Set(
    existingDocs
      .filter((d) => d.documentTypeId && d.isLatest)
      .map((d) => d.documentTypeId!.toString()),
  );

  for (const requirement of requirements) {
    // Skip if a document with this type already exists
    if (existingDocTypeIds.has(requirement.documentTypeId.toString())) {
      continue;
    }

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

/**
 * Auto-reuse company documents from other processes of the same company.
 * Called after document checklist generation when creating a new process.
 */
export async function autoReuseCompanyDocuments(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
): Promise<number> {
  const process = await ctx.db.get(individualProcessId);
  if (!process?.companyApplicantId) return 0;

  // Get pending documents for this process
  const pendingDocs = await ctx.db
    .query("documentsDelivered")
    .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", individualProcessId))
    .collect();

  const companyDocs = pendingDocs.filter(
    (doc) => doc.status === "not_started" && doc.documentTypeId && doc.isLatest,
  );
  if (companyDocs.length === 0) return 0;

  // Check which of these are company documents
  const docTypeCache = new Map<string, { isCompanyDocument?: boolean }>();
  const companyPendingDocs = [];
  for (const doc of companyDocs) {
    if (!doc.documentTypeId) continue;
    let docType = docTypeCache.get(doc.documentTypeId);
    if (!docType) {
      const dt = await ctx.db.get(doc.documentTypeId);
      docType = dt ?? { isCompanyDocument: false };
      docTypeCache.set(doc.documentTypeId, docType);
    }
    if (docType.isCompanyDocument) {
      companyPendingDocs.push(doc);
    }
  }
  if (companyPendingDocs.length === 0) return 0;

  // Get all other processes for this company
  const otherProcesses = await ctx.db
    .query("individualProcesses")
    .withIndex("by_companyApplicant", (q) => q.eq("companyApplicantId", process.companyApplicantId!))
    .collect();

  // Collect all candidate source documents from other processes
  const sourceByType = new Map<string, typeof pendingDocs[number]>();
  for (const otherProcess of otherProcesses) {
    if (otherProcess._id === individualProcessId) continue;
    const docs = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", otherProcess._id))
      .collect();

    for (const doc of docs) {
      if (
        doc.documentTypeId &&
        doc.isLatest &&
        (doc.storageId || doc.fileUrl) &&
        ["uploaded", "approved", "under_review"].includes(doc.status)
      ) {
        const existing = sourceByType.get(doc.documentTypeId);
        if (!existing || doc.uploadedAt > existing.uploadedAt) {
          sourceByType.set(doc.documentTypeId, doc);
        }
      }
    }
  }

  // Get user for history records
  const userId = await getAuthUserId(ctx);
  if (!userId) return 0;

  let reusedCount = 0;
  for (const targetDoc of companyPendingDocs) {
    const sourceDoc = sourceByType.get(targetDoc.documentTypeId!);
    if (!sourceDoc) continue;

    await ctx.db.patch(targetDoc._id, {
      storageId: sourceDoc.storageId,
      fileName: sourceDoc.fileName,
      fileSize: sourceDoc.fileSize,
      mimeType: sourceDoc.mimeType,
      fileUrl: sourceDoc.fileUrl,
      issueDate: sourceDoc.issueDate,
      expiryDate: sourceDoc.expiryDate,
      status: "approved",
      reusedFromDocumentId: sourceDoc._id,
      uploadedBy: userId,
      uploadedAt: Date.now(),
      reviewedBy: userId,
      reviewedAt: Date.now(),
    });

    await ctx.db.insert("documentStatusHistory", {
      documentId: targetDoc._id,
      previousStatus: "not_started",
      newStatus: "approved",
      changedBy: userId,
      changedAt: Date.now(),
      notes: "Auto-reused from company document in another process",
      metadata: {
        sourceDocumentId: sourceDoc._id,
        sourceProcessId: sourceDoc.individualProcessId,
        fileName: sourceDoc.fileName,
      },
    });

    // Auto-create conditions for the document
    if (targetDoc.documentTypeId) {
      await ctx.scheduler.runAfter(0, internal.documentDeliveredConditions.autoCreateForDocument, {
        documentsDeliveredId: targetDoc._id,
        documentTypeId: targetDoc.documentTypeId,
        individualProcessId,
      });
    }

    reusedCount++;
  }

  return reusedCount;
}
