import { MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getProcessStatusAtUpload } from "./documentProgressSnapshot";
import {
  getDocumentCreatedAt,
  hasDocumentContent,
} from "./documentReceiptTiming";

interface LegalFrameworkChecklistRule {
  documentTypeId: Id<"documentTypes">;
  documentRequirementId?: Id<"documentRequirements">;
  documentTypeLegalFrameworkId?: Id<"documentTypesLegalFrameworks">;
  isRequired: boolean;
  excludeFromReportByDefault?: boolean;
}

export interface LegalFrameworkChecklistReconciliation {
  archivedCount: number;
  createdCount: number;
  reusedFilledCount: number;
}

/**
 * Helper function to generate document checklist for an individual process
 * Creates documentsDelivered records based on the matching document template
 */
export async function generateDocumentChecklist(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
  actingUserId?: Id<"users">,
): Promise<Id<"documentsDelivered">[]> {
  // Get the individual process
  const individualProcess = await ctx.db.get(individualProcessId);
  if (!individualProcess) {
    throw new Error("Individual process not found");
  }

  // Resolve process metadata from the individual row first. Client-request
  // drafts are intentionally not attached to a collective process yet.
  const collectiveProcess = individualProcess.collectiveProcessId
    ? await ctx.db.get(individualProcess.collectiveProcessId)
    : null;

  // Find matching document template
  // Match by processType and legalFramework (if specified)
  const processTypeId =
    individualProcess.processTypeId ?? collectiveProcess?.processTypeId;
  if (!processTypeId) {
    // Cannot generate checklist without processTypeId
    return [];
  }

  const templates = await ctx.db
    .query("documentTemplates")
    .withIndex("by_processType", (q) => q.eq("processTypeId", processTypeId))
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
      `No matching document template found for processType ${processTypeId} and legalFramework ${individualProcess.legalFrameworkId}`,
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
  const createdAt = Date.now();
  const waitingStartedAt = individualProcess.createdAt;

  // Get current user to set as uploader (will be admin who created the process)
  const userId = actingUserId ?? (await getAuthUserId(ctx));
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

    const documentType = await ctx.db.get(requirement.documentTypeId);

    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: individualProcessId,
      documentTypeId: requirement.documentTypeId,
      documentRequirementId: requirement._id,
      personId: individualProcess.personId,
      companyId:
        individualProcess.companyApplicantId ?? collectiveProcess?.companyId,
      fileName: "",
      fileUrl: "",
      fileSize: 0,
      mimeType: "",
      status: "not_started",
      uploadedBy: userId,
      uploadedAt: createdAt,
      createdAt,
      waitingStartedAt,
      version: 1,
      isLatest: true,
      excludedFromReport: documentType?.excludeFromReportByDefault || undefined,
    });

    createdDocumentIds.push(documentId);
    existingDocTypeIds.add(requirement.documentTypeId.toString());
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
  actingUserId?: Id<"users">,
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
  const userId = actingUserId ?? (await getAuthUserId(ctx));
  if (!userId) {
    throw new Error("Not authenticated");
  }

  // Load existing rows once and maintain the set as inserts happen. This makes
  // repeated preparation idempotent without one process-wide read per rule.
  const createdDocumentIds: Id<"documentsDelivered">[] = [];
  const createdAt = Date.now();
  const waitingStartedAt = individualProcess.createdAt;
  const existingDocs = await ctx.db
    .query("documentsDelivered")
    .withIndex("by_individualProcess", (q) =>
      q.eq("individualProcessId", individualProcessId),
    )
    .collect();
  const existingDocTypeIds = new Set(
    existingDocs
      .filter((document) => document.documentTypeId && document.isLatest)
      .map((document) => document.documentTypeId!.toString()),
  );

  for (const assoc of associations) {
    // Check if document type is still active
    const documentType = await ctx.db.get(assoc.documentTypeId);
    if (!documentType || !documentType.isActive) {
      continue;
    }

    if (existingDocTypeIds.has(assoc.documentTypeId.toString())) {
      continue;
    }

    // Create pending document record
    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: individualProcessId,
      documentTypeId: assoc.documentTypeId,
      documentTypeLegalFrameworkId: assoc._id,
      isRequired: assoc.isRequired,
      personId: individualProcess.personId,
      companyId:
        individualProcess.companyApplicantId ?? collectiveProcess?.companyId,
      fileName: "",
      fileUrl: "",
      fileSize: 0,
      mimeType: "",
      status: "not_started",
      uploadedBy: userId,
      uploadedAt: createdAt,
      createdAt,
      waitingStartedAt,
      version: 1,
      isLatest: true,
      excludedFromReport: documentType.excludeFromReportByDefault || undefined,
    });

    createdDocumentIds.push(documentId);
    existingDocTypeIds.add(assoc.documentTypeId.toString());
  }

  return createdDocumentIds;
}

/**
 * Reconciles the main checklist after the process type or legal framework
 * changes. The document type is the stable identity across frameworks:
 * existing versions and files are preserved when the new framework asks for
 * the same type, while requirements that no longer apply are removed from the
 * current checklist without deleting their history or storage objects.
 */
export async function reconcileDocumentChecklistForLegalFramework(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
  actingUserId?: Id<"users">,
): Promise<LegalFrameworkChecklistReconciliation> {
  const individualProcess = await ctx.db.get(individualProcessId);
  if (!individualProcess) {
    throw new Error("Individual process not found");
  }

  const collectiveProcess = individualProcess.collectiveProcessId
    ? await ctx.db.get(individualProcess.collectiveProcessId)
    : null;
  const processTypeId =
    individualProcess.processTypeId ?? collectiveProcess?.processTypeId;

  const [associations, templates] = await Promise.all([
    individualProcess.legalFrameworkId
      ? ctx.db
          .query("documentTypesLegalFrameworks")
          .withIndex("by_legalFramework", (q) =>
            q.eq("legalFrameworkId", individualProcess.legalFrameworkId!),
          )
          .collect()
      : Promise.resolve([]),
    processTypeId
      ? ctx.db
          .query("documentTemplates")
          .withIndex("by_processType", (q) =>
            q.eq("processTypeId", processTypeId),
          )
          .collect()
      : Promise.resolve([]),
  ]);

  const matchingTemplate = templates
    .filter((template) => {
      if (!template.isActive) return false;
      if (!individualProcess.legalFrameworkId && !template.legalFrameworkId) {
        return true;
      }
      return template.legalFrameworkId === individualProcess.legalFrameworkId;
    })
    .sort((a, b) => b.version - a.version)[0];

  const requirements = matchingTemplate
    ? await ctx.db
        .query("documentRequirements")
        .withIndex("by_template", (q) =>
          q.eq("templateId", matchingTemplate._id),
        )
        .collect()
    : [];

  const rulesByDocumentType = new Map<
    string,
    LegalFrameworkChecklistRule
  >();

  for (const requirement of requirements) {
    rulesByDocumentType.set(requirement.documentTypeId, {
      documentTypeId: requirement.documentTypeId,
      documentRequirementId: requirement._id,
      isRequired: requirement.isRequired,
    });
  }

  // Associations are the current source of truth and take precedence over a
  // legacy template when both describe the same document type.
  for (const association of associations) {
    rulesByDocumentType.set(association.documentTypeId, {
      documentTypeId: association.documentTypeId,
      documentTypeLegalFrameworkId: association._id,
      isRequired: association.isRequired,
    });
  }

  const activeRules = new Map<string, LegalFrameworkChecklistRule>();
  await Promise.all(
    Array.from(rulesByDocumentType.values()).map(async (rule) => {
      const documentType = await ctx.db.get(rule.documentTypeId);
      if (!documentType || documentType.isActive === false) return;

      activeRules.set(rule.documentTypeId, {
        ...rule,
        excludeFromReportByDefault:
          documentType.excludeFromReportByDefault,
      });
    }),
  );

  const existingDocuments = await ctx.db
    .query("documentsDelivered")
    .withIndex("by_individualProcess", (q) =>
      q.eq("individualProcessId", individualProcessId),
    )
    .collect();

  // Documents attached to a particular progress/status occurrence (for
  // example, an exigencia) are not part of the main legal-framework checklist.
  const mainChecklistDocuments = existingDocuments.filter(
    (document) => !document.individualProcessStatusId,
  );
  const documentsByType = new Map<
    string,
    Doc<"documentsDelivered">[]
  >();

  for (const document of mainChecklistDocuments) {
    if (!document.documentTypeId) continue;
    const key = document.documentTypeId.toString();
    const current = documentsByType.get(key) ?? [];
    current.push(document);
    documentsByType.set(key, current);
  }

  let archivedCount = 0;
  let reusedFilledCount = 0;

  for (const document of mainChecklistDocuments) {
    if (!document.documentTypeId || !document.isLatest) continue;

    const isFrameworkManaged = Boolean(
      document.documentRequirementId ||
        document.documentTypeLegalFrameworkId,
    );
    if (
      isFrameworkManaged &&
      !activeRules.has(document.documentTypeId.toString())
    ) {
      await ctx.db.patch(document._id, { isLatest: false });
      archivedCount += 1;
    }
  }

  for (const [documentTypeId, rule] of activeRules) {
    const matchingDocuments = documentsByType.get(documentTypeId) ?? [];
    const currentDocuments = matchingDocuments.filter(
      (document) => document.isLatest,
    );

    // A type archived during an earlier framework switch can become current
    // again without losing its filled content or version chain.
    if (currentDocuments.length === 0 && matchingDocuments.length > 0) {
      const newestDocument = [...matchingDocuments].sort(
        (a, b) => b.version - a.version || b.uploadedAt - a.uploadedAt,
      )[0];
      await ctx.db.patch(newestDocument._id, { isLatest: true });
    }

    if (matchingDocuments.some(hasDocumentContent)) {
      reusedFilledCount += 1;
    }

    for (const document of matchingDocuments) {
      await ctx.db.patch(document._id, {
        documentRequirementId: rule.documentRequirementId,
        documentTypeLegalFrameworkId:
          rule.documentTypeLegalFrameworkId,
        isRequired: rule.isRequired,
      });
    }
  }

  const userId = actingUserId ?? (await getAuthUserId(ctx));
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const now = Date.now();
  let createdCount = 0;

  for (const [documentTypeId, rule] of activeRules) {
    const matchingDocuments = documentsByType.get(documentTypeId) ?? [];
    if (matchingDocuments.length > 0) continue;

    await ctx.db.insert("documentsDelivered", {
      individualProcessId,
      documentTypeId: rule.documentTypeId,
      documentRequirementId: rule.documentRequirementId,
      documentTypeLegalFrameworkId:
        rule.documentTypeLegalFrameworkId,
      isRequired: rule.isRequired,
      personId: individualProcess.personId,
      companyId:
        individualProcess.companyApplicantId ?? collectiveProcess?.companyId,
      fileName: "",
      fileUrl: "",
      fileSize: 0,
      mimeType: "",
      status: "not_started",
      uploadedBy: userId,
      uploadedAt: now,
      createdAt: now,
      waitingStartedAt: individualProcess.createdAt,
      version: 1,
      isLatest: true,
      excludedFromReport:
        rule.excludeFromReportByDefault || undefined,
    });
    createdCount += 1;
  }

  return { archivedCount, createdCount, reusedFilledCount };
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
  return await generateDocumentChecklistByLegalFramework(
    ctx,
    individualProcessId,
  );
}

/**
 * Auto-reuse company documents from other processes of the same company.
 * Called after document checklist generation when creating a new process.
 */
export async function autoReuseCompanyDocuments(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
  actingUserId?: Id<"users">,
): Promise<number> {
  const process = await ctx.db.get(individualProcessId);
  if (!process?.companyApplicantId) return 0;

  // Get pending documents for this process
  const pendingDocs = await ctx.db
    .query("documentsDelivered")
    .withIndex("by_individualProcess", (q) =>
      q.eq("individualProcessId", individualProcessId),
    )
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
    .withIndex("by_companyApplicant", (q) =>
      q.eq("companyApplicantId", process.companyApplicantId!),
    )
    .collect();

  // Collect all candidate source documents from other processes
  const sourceByType = new Map<string, (typeof pendingDocs)[number]>();
  for (const otherProcess of otherProcesses) {
    if (otherProcess._id === individualProcessId) continue;
    const docs = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", otherProcess._id),
      )
      .collect();

    for (const doc of docs) {
      if (
        doc.documentTypeId &&
        doc.isLatest &&
        (doc.storageId || doc.fileUrl) &&
        doc.status === "approved"
      ) {
        const existing = sourceByType.get(doc.documentTypeId);
        if (!existing || doc.uploadedAt > existing.uploadedAt) {
          sourceByType.set(doc.documentTypeId, doc);
        }
      }
    }
  }

  // Get user for history records
  const userId = actingUserId ?? (await getAuthUserId(ctx));
  if (!userId) return 0;
  const processStatusAtUpload = await getProcessStatusAtUpload(ctx, process);

  let reusedCount = 0;
  for (const targetDoc of companyPendingDocs) {
    const sourceDoc = sourceByType.get(targetDoc.documentTypeId!);
    if (!sourceDoc) continue;

    const uploadedAt = Date.now();
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
      uploadedAt,
      createdAt: getDocumentCreatedAt(targetDoc),
      receivedAt: uploadedAt,
      reviewedBy: sourceDoc.reviewedBy,
      reviewedAt: sourceDoc.reviewedAt ?? uploadedAt,
      processStatusAtUpload:
        targetDoc.processStatusAtUpload ?? processStatusAtUpload,
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
      await ctx.scheduler.runAfter(
        0,
        internal.documentDeliveredConditions.autoCreateForDocument,
        {
          documentsDeliveredId: targetDoc._id,
          documentTypeId: targetDoc.documentTypeId,
          individualProcessId,
        },
      );
    }

    reusedCount++;
  }

  return reusedCount;
}
