import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAdmin, getCurrentUserProfile, requireClientCanAccessProcess } from "./lib/auth";
import { internal } from "./_generated/api";
import { checkDocumentValidity } from "./lib/documentValidity";
import { getProcessStatusAtUpload } from "./lib/documentProgressSnapshot";
import { createCachedGet } from "./lib/cachedGet";
import {
  getDocumentCreatedAt,
  getDocumentReceivedAt,
  hasDocumentContent,
  isValidIsoDate,
  resolveDocumentReceivedAt,
} from "./lib/documentReceiptTiming";
import {
  canAccessDocument,
  filterAccessibleDocuments,
  filterClientChecklistDocuments,
  resolveClientDocumentVisibility,
} from "./lib/clientDocumentVisibility";

function getFullName(person: { givenNames: string; middleName?: string; surname?: string }): string {
  return [person.givenNames, person.middleName, person.surname].filter(Boolean).join(" ");
}

type ClientVisibleDocument = Omit<
  Doc<"documentsDelivered">,
  "receivedAt" | "reviewedAt" | "uploadedAt"
> & {
  receivedAt?: undefined;
  reviewedAt?: undefined;
  uploadedAt?: undefined;
};

/**
 * Receipt timestamps are operational metadata. Clients may submit files, but
 * only administrators may receive these fields back from public queries.
 */
function projectDocumentForViewer(
  document: Doc<"documentsDelivered">,
  viewerRole: "admin" | "client",
): Doc<"documentsDelivered"> | ClientVisibleDocument {
  if (viewerRole === "admin") return document;

  const {
    receivedAt: restrictedReceivedAt,
    reviewedAt: restrictedReviewedAt,
    uploadedAt: restrictedUploadedAt,
    ...clientVisibleDocument
  } = document;

  void restrictedReceivedAt;
  void restrictedReviewedAt;
  void restrictedUploadedAt;

  return clientVisibleDocument;
}

const processStatusAtUploadValidator = v.object({
  individualProcessStatusId: v.optional(v.id("individualProcessStatuses")),
  caseStatusId: v.optional(v.id("caseStatuses")),
  name: v.string(),
  nameEn: v.optional(v.string()),
  code: v.string(),
  color: v.optional(v.string()),
  category: v.optional(v.string()),
});

const documentVersionByProgressValidator = v.object({
  _id: v.id("documentsDelivered"),
  _creationTime: v.number(),
  documentTypeId: v.optional(v.id("documentTypes")),
  documentRequirementId: v.optional(v.id("documentRequirements")),
  fileName: v.string(),
  fileUrl: v.string(),
  fileSize: v.number(),
  mimeType: v.string(),
  status: v.string(),
  uploadedAt: v.number(),
  createdAt: v.number(),
  receivedAt: v.number(),
  version: v.number(),
  isLatest: v.boolean(),
  documentName: v.optional(v.string()),
  processStatusAtUpload: v.optional(processStatusAtUploadValidator),
  documentType: v.union(
    v.object({
      _id: v.id("documentTypes"),
      name: v.string(),
      isInformationOnly: v.optional(v.boolean()),
    }),
    v.null(),
  ),
});

/**
 * Query to list documents delivered for an individual process
 * Access control: admin sees all, client sees their company's docs
 */
export const list = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
    status: v.optional(v.string()),
    documentTypeId: v.optional(v.id("documentTypes")),
  },
  handler: async (ctx, { individualProcessId, status, documentTypeId }) => {
    // Get individual process to check company access
    const individualProcess = await ctx.db.get(individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Check access control — clients only see processes belonging to their
    // CURRENT companies (companyApplicantId, userApplicantCompanyId, or
    // collectiveProcess.companyId via peopleCompanies.isCurrent).
    const userProfile = await getCurrentUserProfile(ctx);
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Query documents by individual process
    const documentsQuery = ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", individualProcessId));

    let documents = await documentsQuery.collect();

    // Filter by status if provided
    if (status) {
      documents = documents.filter((doc) => doc.status === status);
    }

    // Filter by documentType if provided
    if (documentTypeId) {
      documents = documents.filter((doc) => doc.documentTypeId === documentTypeId);
    }

    // Filter to show only latest versions by default
    documents = documents.filter((doc) => doc.isLatest);
    documents = filterAccessibleDocuments(documents, visibility);

    // Enrich with related data
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const documentType = doc.documentTypeId
          ? await cachedGet(doc.documentTypeId)
          : null;
        const documentRequirement = doc.documentRequirementId
          ? await cachedGet(doc.documentRequirementId)
          : null;
        const uploadedByUser = await cachedGet(doc.uploadedBy);
        const reviewedByUser = doc.reviewedBy
          ? await cachedGet(doc.reviewedBy)
          : null;

        // Enrich linked status
        let linkedStatus = undefined;
        if (doc.individualProcessStatusId) {
          const statusEntry = await cachedGet(doc.individualProcessStatusId);
          if (statusEntry) {
            const caseStatus = await cachedGet(statusEntry.caseStatusId);
            if (caseStatus) {
              linkedStatus = {
                caseStatusName: caseStatus.name,
                caseStatusCode: caseStatus.code,
                caseStatusColor: caseStatus.color,
                date: statusEntry.date,
                clientDeadlineDate: statusEntry.clientDeadlineDate,
                individualProcessStatusId: doc.individualProcessStatusId!,
              };
            }
          }
        }

        return {
          ...projectDocumentForViewer(doc, userProfile.role),
          documentType,
          documentRequirement,
          uploadedByUser,
          reviewedByUser,
          linkedStatus,
        };
      }),
    );

    return enrichedDocuments;
  },
});

/**
 * Lists every submitted file version with the immutable process-progress
 * snapshot captured when that exact version was uploaded.
 */
export const listVersionsByProgress = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  returns: v.array(documentVersionByProgressValidator),
  handler: async (ctx, { individualProcessId }) => {
    const individualProcess = await ctx.db.get(individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const userProfile = await requireAdmin(ctx);
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    const processDocuments = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", individualProcessId),
      )
      .collect();

    const visibleVersions = filterAccessibleDocuments(
      processDocuments,
      visibility,
    )
      .filter(
        (document) =>
          document.version > 0 &&
          (document.storageId !== undefined || document.fileUrl.trim().length > 0),
      )
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    return await Promise.all(
      visibleVersions.map(async (document) => {
        const documentType = document.documentTypeId
          ? await cachedGet(document.documentTypeId)
          : null;

        return {
          _id: document._id,
          _creationTime: document._creationTime,
          documentTypeId: document.documentTypeId,
          documentRequirementId: document.documentRequirementId,
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          status: document.status,
          uploadedAt: document.uploadedAt,
          createdAt: getDocumentCreatedAt(document),
          receivedAt: getDocumentReceivedAt(document) ?? document.uploadedAt,
          version: document.version,
          isLatest: document.isLatest,
          documentName: document.documentName,
          processStatusAtUpload: document.processStatusAtUpload,
          documentType: documentType
            ? {
                _id: documentType._id,
                name: documentType.name,
                isInformationOnly: documentType.isInformationOnly,
              }
            : null,
        };
      }),
    );
  },
});

/**
 * Query to list documents linked to a specific status entry (e.g., "Exigência")
 */
export const listByStatus = query({
  args: {
    individualProcessStatusId: v.id("individualProcessStatuses"),
  },
  handler: async (ctx, { individualProcessStatusId }) => {
    // Get the status entry to verify it exists and get process context
    const statusEntry = await ctx.db.get(individualProcessStatusId);
    if (!statusEntry) {
      throw new Error("Status entry not found");
    }

    const individualProcess = await ctx.db.get(statusEntry.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const userProfile = await getCurrentUserProfile(ctx);
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Query documents linked to this status entry
    const documents = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcessStatus", (q) =>
        q.eq("individualProcessStatusId", individualProcessStatusId)
      )
      .collect();

    // Filter to latest versions only
    const latestDocs = filterAccessibleDocuments(
      documents.filter((doc) => doc.isLatest),
      visibility,
    );

    // Enrich with related data
    const enrichedDocuments = await Promise.all(
      latestDocs.map(async (doc) => {
        const documentType = doc.documentTypeId
          ? await cachedGet(doc.documentTypeId)
          : null;
        const uploadedByUser = doc.uploadedBy
          ? await cachedGet(doc.uploadedBy)
          : null;

        // Find previous version's rejection reason
        let previousRejectionReason: string | undefined;
        if (doc.version > 1) {
          const previousVersion = documents.find(
            (d) =>
              d.documentTypeId === doc.documentTypeId &&
              d.documentRequirementId === doc.documentRequirementId &&
              d.version === doc.version - 1
          );
          previousRejectionReason = previousVersion?.rejectionReason;
        }

        return {
          ...projectDocumentForViewer(doc, userProfile.role),
          documentType,
          uploadedByUser,
          previousRejectionReason,
        };
      }),
    );

    return {
      documents: enrichedDocuments,
      companyApplicantId: individualProcess.companyApplicantId,
    };
  },
});

/**
 * Query to get a single document by ID
 */
export const get = query({
  args: {
    id: v.id("documentsDelivered"),
  },
  handler: async (ctx, { id }) => {
    const document = await ctx.db.get(id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Check access control
    const individualProcess = await ctx.db.get(document.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const userProfile = await getCurrentUserProfile(ctx);
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );
    if (!canAccessDocument(document, visibility)) {
      throw new Error("Document not found");
    }

    // Enrich with related data
    const documentType = document.documentTypeId
      ? await ctx.db.get(document.documentTypeId)
      : null;
    const documentRequirement = document.documentRequirementId
      ? await ctx.db.get(document.documentRequirementId)
      : null;
    const uploadedByUser = await ctx.db.get(document.uploadedBy);
    const reviewedByUser = document.reviewedBy
      ? await ctx.db.get(document.reviewedBy)
      : null;

    // Enrich reused document info
    let reusedFromInfo = null;
    if (userProfile.role === "admin" && document.reusedFromDocumentId) {
      const sourceDoc = await ctx.db.get(document.reusedFromDocumentId);
      if (sourceDoc) {
        const sourceProcess = await ctx.db.get(sourceDoc.individualProcessId);
        if (sourceProcess) {
          const sourcePerson = await ctx.db.get(sourceProcess.personId);
          reusedFromInfo = {
            documentId: document.reusedFromDocumentId,
            personName: sourcePerson ? getFullName(sourcePerson) : undefined,
            processId: sourceDoc.individualProcessId,
          };
        }
      }
    }

    return {
      ...projectDocumentForViewer(document, userProfile.role),
      documentType,
      documentRequirement,
      uploadedByUser,
      reviewedByUser,
      reusedFromInfo,
    };
  },
});

/**
 * Mutation to upload a document
 * Creates a new version if replacing an existing document
 */
export const upload = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    documentTypeId: v.id("documentTypes"),
    documentRequirementId: v.optional(v.id("documentRequirements")),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    expiryDate: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    versionNotes: v.optional(v.string()),
    preFulfilledConditionIds: v.optional(
      v.array(v.id("documentTypeConditions"))
    ),
    isIllegible: v.optional(v.boolean()),
    rejectionReason: v.optional(v.string()),
    autoApprove: v.optional(v.boolean()),
    bypassConditions: v.optional(v.boolean()),
    receivedDate: v.optional(v.string()),
  },
  returns: v.id("documentsDelivered"),
  handler: async (ctx, args) => {
    // Require admin role when auto-approving or bypassing conditions
    let userProfile;
    if (args.autoApprove || args.bypassConditions) {
      userProfile = await requireAdmin(ctx);
    } else {
      userProfile = await getCurrentUserProfile(ctx);
    }

    // Get individual process to check access and get related data
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    // Check access control — handles client access via any of the company linkages
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);

    // Ensure user has userId (pre-registered users cannot upload documents)
    if (!userProfile.userId) {
      throw new Error("User profile must be activated before uploading documents");
    }
    const uploaderUserId = userProfile.userId; // Save for later use

    // Get file URL from storage
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) {
      throw new Error("Failed to get file URL from storage");
    }

    // Check if there's an existing document for this requirement
    const allProcessDocs = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", args.individualProcessId))
      .collect();

    const allMatchingDocs = allProcessDocs.filter(
      (doc) =>
        doc.documentTypeId === args.documentTypeId &&
        doc.documentRequirementId === args.documentRequirementId
    );

    const currentLatest = allMatchingDocs.find((doc) => doc.isLatest);
    const fillsPendingVersion =
      currentLatest !== undefined &&
      currentLatest.status === "not_started" &&
      !hasDocumentContent(currentLatest);
    const version = fillsPendingVersion
      ? Math.max(1, currentLatest.version)
      : allMatchingDocs.length > 0
        ? Math.max(...allMatchingDocs.map((doc) => doc.version)) + 1
        : 1;

    // Create new document record
    const isIllegible = args.isIllegible === true;
    let canAutoApprove = args.autoApprove === true && !isIllegible;

    // Check conditions — if required conditions are unfulfilled, skip auto-approve (unless bypassed)
    if (canAutoApprove && !args.bypassConditions) {
      const conditionLinks = await ctx.db
        .query("documentTypeConditionLinks")
        .withIndex("by_documentType", (q) =>
          q.eq("documentTypeId", args.documentTypeId)
        )
        .collect();

      if (conditionLinks.length > 0) {
        const preFulfilledSet = new Set(args.preFulfilledConditionIds || []);
        for (const link of conditionLinks) {
          if (!link.isRequired) continue;
          const condition = await ctx.db.get(link.documentTypeConditionId);
          if (condition && condition.isActive && !preFulfilledSet.has(condition._id)) {
            canAutoApprove = false;
            break;
          }
        }
      }
    }

    const status = canAutoApprove ? "approved" : (isIllegible ? "rejected" : "uploaded");
    const now = Date.now();
    const createdAt = fillsPendingVersion
      ? getDocumentCreatedAt(currentLatest)
      : now;
    const receivedAt = resolveDocumentReceivedAt({
      createdAt,
      requestedDate: args.receivedDate,
      userRole: userProfile.role,
      now,
    });
    const uploadedAt = receivedAt;
    const processStatusAtUpload = await getProcessStatusAtUpload(ctx, individualProcess);
    let documentId: Id<"documentsDelivered">;

    if (fillsPendingVersion) {
      documentId = currentLatest._id;
      await ctx.db.patch(documentId, {
        storageId: args.storageId,
        fileName: args.fileName,
        fileUrl,
        fileSize: args.fileSize,
        mimeType: args.mimeType,
        status,
        uploadedBy: uploaderUserId,
        uploadedAt,
        createdAt,
        receivedAt,
        reviewedBy: (canAutoApprove || isIllegible) ? uploaderUserId : undefined,
        reviewedAt: (canAutoApprove || isIllegible) ? uploadedAt : undefined,
        rejectionReason: isIllegible ? (args.rejectionReason || "Documento ilegível") : undefined,
        isIllegible: isIllegible || undefined,
        bypassConditions: args.bypassConditions || undefined,
        expiryDate: args.expiryDate,
        issueDate: args.issueDate,
        version,
        versionNotes: args.versionNotes,
        processStatusAtUpload,
      });
    } else {
      if (currentLatest) {
        await ctx.db.patch(currentLatest._id, {
          isLatest: false,
        });
      }

      documentId = await ctx.db.insert("documentsDelivered", {
        individualProcessId: args.individualProcessId,
        documentTypeId: args.documentTypeId,
        documentRequirementId: args.documentRequirementId,
        personId: individualProcess.personId,
        companyId: collectiveProcess?.companyId,
        storageId: args.storageId,
        fileName: args.fileName,
        fileUrl,
        fileSize: args.fileSize,
        mimeType: args.mimeType,
        status,
        uploadedBy: uploaderUserId,
        uploadedAt,
        createdAt,
        receivedAt,
        reviewedBy: (canAutoApprove || isIllegible) ? uploaderUserId : undefined,
        reviewedAt: (canAutoApprove || isIllegible) ? uploadedAt : undefined,
        rejectionReason: isIllegible ? (args.rejectionReason || "Documento ilegível") : undefined,
        isIllegible: isIllegible || undefined,
        bypassConditions: args.bypassConditions || undefined,
        expiryDate: args.expiryDate,
        issueDate: args.issueDate,
        version,
        isLatest: true,
        versionNotes: args.versionNotes,
        processStatusAtUpload,
        individualProcessStatusId: currentLatest?.individualProcessStatusId,
      });
    }

    // Record status history
    if (isIllegible) {
      await ctx.db.insert("documentStatusHistory", {
        documentId,
        previousStatus: undefined,
        newStatus: "rejected",
        changedBy: uploaderUserId,
        changedAt: Date.now(),
        notes: args.rejectionReason || "Documento ilegível",
        metadata: {
          fileName: args.fileName,
          version,
          isIllegible: true,
        },
      });
    } else if (canAutoApprove) {
      await ctx.db.insert("documentStatusHistory", {
        documentId,
        previousStatus: "uploaded",
        newStatus: "approved",
        changedBy: uploaderUserId,
        changedAt: Date.now(),
        metadata: {
          fileName: args.fileName,
          version,
        },
      });
    }

    // Auto-create conditions for this document based on document type
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.documentDeliveredConditions.autoCreateForDocument,
        {
          documentsDeliveredId: documentId,
          documentTypeId: args.documentTypeId,
          individualProcessId: args.individualProcessId,
          preFulfilledConditionIds: args.preFulfilledConditionIds,
          previousDocumentsDeliveredId: fillsPendingVersion
            ? undefined
            : currentLatest?._id,
        }
      );
    } catch (error) {
      console.error("Failed to auto-create conditions:", error);
    }

    // Log activity (non-blocking)
    try {
      const [person, documentType] = await Promise.all([
        ctx.db.get(individualProcess.personId),
        ctx.db.get(args.documentTypeId),
      ]);

      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: uploaderUserId,
        action: isIllegible ? "rejected" : (canAutoApprove ? "approved" : "uploaded"),
        entityType: "document",
        entityId: documentId,
        details: {
          fileName: args.fileName,
          fileSize: args.fileSize,
          documentType: documentType?.name,
          personName: person ? getFullName(person) : undefined,
          collectiveProcessReference: collectiveProcess?.referenceNumber,
          version,
          isReplacement: version > 1,
          isIllegible: isIllegible || undefined,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    // Notify all admins when a client uploads a document (status="uploaded")
    if (userProfile.role === "client" && !canAutoApprove && !isIllegible) {
      try {
        const [person, documentType, admins] = await Promise.all([
          ctx.db.get(individualProcess.personId),
          ctx.db.get(args.documentTypeId),
          ctx.db
            .query("userProfiles")
            .withIndex("by_role", (q) => q.eq("role", "admin"))
            .collect(),
        ]);

        const docName = documentType?.name || args.fileName;
        const personName = person ? getFullName(person) : "candidato";
        const clientName = userProfile.fullName || "Cliente";

        for (const admin of admins) {
          if (!admin.userId || !admin.isActive) continue;
          await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
            userId: admin.userId,
            type: "client_document_uploaded",
            title: "Cliente enviou um documento",
            message: `${clientName} enviou "${docName}" no processo de ${personName}`,
            entityType: "individualProcess",
            entityId: args.individualProcessId,
          });
        }
      } catch (error) {
        console.error("Failed to notify admins of client upload:", error);
      }
    }

    return documentId;
  },
});

/**
 * Mutation to approve a document (admin only)
 * Now allows re-approval and records history
 */
export const approve = mutation({
  args: {
    id: v.id("documentsDelivered"),
  },
  handler: async (ctx, { id }) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

    const document = await ctx.db.get(id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Can't approve a document that hasn't been uploaded yet
    if (document.status === "not_started") {
      throw new Error("Cannot approve a document that hasn't been uploaded yet");
    }

    // Validate conditions before approval
    const conditions = await ctx.db
      .query("documentDeliveredConditions")
      .withIndex("by_documentDelivered", (q) => q.eq("documentsDeliveredId", id))
      .collect();

    if (conditions.length > 0 && !document.bypassConditions) {
      const now = Date.now();
      const unfulfilledRequired: string[] = [];
      const expiredConditions: string[] = [];

      for (const condition of conditions) {
        const conditionDef = await ctx.db.get(condition.documentTypeConditionId);
        if (!conditionDef) continue;

        // Check if required and not fulfilled
        if (conditionDef.isRequired && !condition.isFulfilled) {
          unfulfilledRequired.push(conditionDef.name);
        }

        // Check if expired
        if (condition.expiresAt && condition.expiresAt < now) {
          expiredConditions.push(conditionDef.name);
        }
      }

      if (unfulfilledRequired.length > 0) {
        throw new Error(
          `Cannot approve: Required conditions not fulfilled: ${unfulfilledRequired.join(", ")}`
        );
      }

      if (expiredConditions.length > 0) {
        throw new Error(
          `Cannot approve: Some conditions have expired: ${expiredConditions.join(", ")}`
        );
      }
    }

    // Validate document validity (expiry/age rules)
    if (document.documentTypeLegalFrameworkId) {
      const association = await ctx.db.get(document.documentTypeLegalFrameworkId);
      if (association && association.validityType && association.validityDays) {
        const validityCheck = checkDocumentValidity(
          association.validityType,
          association.validityDays,
          document.issueDate,
          document.expiryDate,
        );
        if (validityCheck.status === "expired") {
          throw new Error(
            `Cannot approve: Document validity check failed (${validityCheck.messageKey})`
          );
        }
        if (validityCheck.status === "missing_date") {
          throw new Error(
            `Cannot approve: Required date is missing for validity check (${validityCheck.messageKey})`
          );
        }
      }
    }

    const previousStatus = document.status;

    // Skip if already approved (no change needed)
    if (previousStatus === "approved") {
      return id;
    }

    await ctx.db.patch(id, {
      status: "approved",
      reviewedBy: adminProfile.userId,
      reviewedAt: Date.now(),
      rejectionReason: undefined,
    });

    // Record status history
    await ctx.db.insert("documentStatusHistory", {
      documentId: id,
      previousStatus: previousStatus,
      newStatus: "approved",
      changedBy: adminProfile.userId!,
      changedAt: Date.now(),
      metadata: {
        fileName: document.fileName,
        version: document.version,
      },
    });

    // Send notification to document uploader
    try {
      const documentType = document.documentTypeId
        ? await ctx.db.get(document.documentTypeId)
        : null;
      const documentTypeName = documentType?.name || "Document";

      await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
        userId: document.uploadedBy,
        type: "document_approved",
        title: "Document Approved",
        message: `Your document "${documentTypeName}" has been approved`,
        entityType: "document",
        entityId: id,
      });
    } catch (error) {
      console.error("Failed to create document approval notification:", error);
    }

    // Log activity (non-blocking, only if admin has userId)
    try {
      if (adminProfile.userId) {
        const [individualProcess, documentType, person] = await Promise.all([
          ctx.db.get(document.individualProcessId),
          document.documentTypeId ? ctx.db.get(document.documentTypeId) : null,
          document.personId ? ctx.db.get(document.personId) : null,
        ]);

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: adminProfile.userId,
          action: "approved",
          entityType: "document",
          entityId: id,
          details: {
            fileName: document.fileName,
            documentType: documentType?.name,
            personName: person ? getFullName(person) : undefined,
            previousStatus: previousStatus,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Mutation to reject a document (admin only)
 * Now allows re-rejection and records history
 */
export const reject = mutation({
  args: {
    id: v.id("documentsDelivered"),
    rejectionReason: v.string(),
    isIllegible: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, rejectionReason, isIllegible }) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

    if (!rejectionReason || rejectionReason.trim() === "") {
      throw new Error("Rejection reason is required");
    }

    const document = await ctx.db.get(id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Can't reject a document that hasn't been uploaded yet
    if (document.status === "not_started") {
      throw new Error("Cannot reject a document that hasn't been uploaded yet");
    }

    const previousStatus = document.status;

    await ctx.db.patch(id, {
      status: "rejected",
      reviewedBy: adminProfile.userId,
      reviewedAt: Date.now(),
      rejectionReason: rejectionReason,
      isIllegible: isIllegible ?? false,
    });

    // Record status history
    await ctx.db.insert("documentStatusHistory", {
      documentId: id,
      previousStatus: previousStatus,
      newStatus: "rejected",
      changedBy: adminProfile.userId!,
      changedAt: Date.now(),
      notes: rejectionReason,
      metadata: {
        fileName: document.fileName,
        version: document.version,
      },
    });

    // Send notification to document uploader
    try {
      const documentType = document.documentTypeId
        ? await ctx.db.get(document.documentTypeId)
        : null;
      const documentTypeName = documentType?.name || "Document";

      await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
        userId: document.uploadedBy,
        type: "document_rejected",
        title: "Document Rejected",
        message: `Your document "${documentTypeName}" was rejected: ${rejectionReason}`,
        entityType: "document",
        entityId: id,
      });
    } catch (error) {
      console.error("Failed to create document rejection notification:", error);
    }

    // Log activity (non-blocking, only if admin has userId)
    try {
      if (adminProfile.userId) {
        const [individualProcess, documentType, person] = await Promise.all([
          ctx.db.get(document.individualProcessId),
          document.documentTypeId ? ctx.db.get(document.documentTypeId) : null,
          document.personId ? ctx.db.get(document.personId) : null,
        ]);

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: adminProfile.userId,
          action: "rejected",
          entityType: "document",
          entityId: id,
          details: {
            fileName: document.fileName,
            documentType: documentType?.name,
            personName: person ? getFullName(person) : undefined,
            rejectionReason,
            previousStatus: previousStatus,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Query to get version history of a document
 * Returns all versions sorted by version descending
 */
export const getVersionHistory = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
    documentTypeId: v.id("documentTypes"),
    documentRequirementId: v.optional(v.id("documentRequirements")),
  },
  handler: async (ctx, { individualProcessId, documentTypeId, documentRequirementId }) => {
    // Check access control
    const individualProcess = await ctx.db.get(individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const userProfile = await getCurrentUserProfile(ctx);
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Get all versions
    let documents = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", individualProcessId))
      .collect();

    // Filter by documentType and requirement
    documents = documents.filter(
      (doc) =>
        doc.documentTypeId === documentTypeId &&
        doc.documentRequirementId === documentRequirementId &&
        canAccessDocument(doc, visibility)
    );

    const orderedDocuments = [...documents].sort(
      (a, b) => a.version - b.version || a._creationTime - b._creationTime,
    );

    // Enrich with related data including user profile names
    const enrichedDocuments = await Promise.all(
      orderedDocuments.map(async (doc, index) => {
        const uploadedByUser = await cachedGet(doc.uploadedBy);
        let uploadedByProfile = null;
        if (uploadedByUser) {
          uploadedByProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", uploadedByUser._id))
            .first();
        }
        const reviewedByUser = doc.reviewedBy
          ? await cachedGet(doc.reviewedBy)
          : null;
        let reviewedByProfile = null;
        if (reviewedByUser) {
          reviewedByProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", reviewedByUser._id))
            .first();
        }

        const hasContent = hasDocumentContent(doc);
        const successor = orderedDocuments[index + 1];

        const documentForViewer = projectDocumentForViewer(
          doc,
          userProfile.role,
        );

        return {
          ...documentForViewer,
          createdAt: getDocumentCreatedAt(doc),
          ...(userProfile.role === "admin"
            ? {
                receivedAt: getDocumentReceivedAt(doc),
                waitingEndedAt:
                  !hasContent && successor
                    ? getDocumentCreatedAt(successor)
                    : undefined,
              }
            : {}),
          hasContent,
          uploadedByUser,
          uploadedByProfile,
          reviewedByUser,
          reviewedByProfile,
        };
      }),
    );

    // Sort by version descending
    return enrichedDocuments.sort((a, b) => b.version - a.version);
  },
});

/**
 * Mutation to restore a previous version of a document (admin only)
 * Creates a NEW version (append-only) reusing the storageId from the old version
 */
export const restoreVersion = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
    versionNotes: v.optional(v.string()),
  },
  returns: v.id("documentsDelivered"),
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);

    const oldDocument = await ctx.db.get(args.documentId);
    if (!oldDocument) {
      throw new Error("Document not found");
    }

    // Cannot restore the current version
    if (oldDocument.isLatest) {
      throw new Error("Cannot restore the current version");
    }

    if (!hasDocumentContent(oldDocument)) {
      throw new ConvexError({
        code: "DOCUMENT_HAS_NO_CONTENT",
        message: "A document version without content cannot be restored",
      });
    }

    if (!adminProfile.userId) {
      throw new Error("Admin user must have a userId");
    }

    // Find the current latest version for this document type + process
    let allVersions = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", oldDocument.individualProcessId)
      )
      .collect();

    allVersions = allVersions.filter(
      (doc) =>
        doc.documentTypeId === oldDocument.documentTypeId &&
        doc.documentRequirementId === oldDocument.documentRequirementId
    );

    const currentLatest = allVersions.find((doc) => doc.isLatest);
    const maxVersion = Math.max(...allVersions.map((doc) => doc.version));

    // Mark current latest as not latest
    if (currentLatest) {
      await ctx.db.patch(currentLatest._id, { isLatest: false });
    }

    const newVersion = maxVersion + 1;
    const notes = args.versionNotes || `Restaurado da versão ${oldDocument.version}`;
    const uploadedAt = Date.now();
    const createdAt = uploadedAt;
    const individualProcess = await ctx.db.get(oldDocument.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }
    const processStatusAtUpload = await getProcessStatusAtUpload(
      ctx,
      individualProcess
    );

    // Create new version reusing the old storageId
    const newDocId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: oldDocument.individualProcessId,
      documentTypeId: oldDocument.documentTypeId,
      documentRequirementId: oldDocument.documentRequirementId,
      documentTypeLegalFrameworkId: oldDocument.documentTypeLegalFrameworkId,
      isRequired: oldDocument.isRequired,
      storageId: oldDocument.storageId,
      personId: oldDocument.personId,
      companyId: oldDocument.companyId,
      fileName: oldDocument.fileName,
      fileUrl: oldDocument.fileUrl,
      fileSize: oldDocument.fileSize,
      mimeType: oldDocument.mimeType,
      status: "uploaded", // Reset to uploaded for re-review
      uploadedBy: adminProfile.userId,
      uploadedAt,
      createdAt,
      receivedAt: uploadedAt,
      expiryDate: oldDocument.expiryDate,
      version: newVersion,
      isLatest: true,
      versionNotes: notes,
      processStatusAtUpload,
      // Preserve exigência link from current latest version
      individualProcessStatusId: currentLatest?.individualProcessStatusId,
      excludedFromReport: oldDocument.excludedFromReport,
      bypassConditions: oldDocument.bypassConditions,
    });

    // Auto-create conditions, carrying forward state from the restored version
    if (oldDocument.documentTypeId) {
      try {
        await ctx.scheduler.runAfter(
          0,
          internal.documentDeliveredConditions.autoCreateForDocument,
          {
            documentsDeliveredId: newDocId,
            documentTypeId: oldDocument.documentTypeId,
            individualProcessId: oldDocument.individualProcessId,
            previousDocumentsDeliveredId: oldDocument._id,
          }
        );
      } catch (error) {
        console.error("Failed to auto-create conditions on restore:", error);
      }
    }

    // Record status history
    await ctx.db.insert("documentStatusHistory", {
      documentId: newDocId,
      previousStatus: undefined,
      newStatus: "uploaded",
      changedBy: adminProfile.userId,
      changedAt: Date.now(),
      notes: notes,
      metadata: {
        restoredFromVersion: oldDocument.version,
        restoredFromDocumentId: oldDocument._id,
        fileName: oldDocument.fileName,
        version: newVersion,
      },
    });

    return newDocId;
  },
});

/**
 * Mutation to soft delete a document (admin only)
 * Sets isLatest = false to keep audit trail
 */
export const remove = mutation({
  args: {
    id: v.id("documentsDelivered"),
  },
  handler: async (ctx, { id }) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

    const document = await ctx.db.get(id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Get related data before soft delete
    const [individualProcess, documentType, person] = await Promise.all([
      ctx.db.get(document.individualProcessId),
      document.documentTypeId ? ctx.db.get(document.documentTypeId) : null,
      document.personId ? ctx.db.get(document.personId) : null,
    ]);

    // Soft delete by marking as not latest
    await ctx.db.patch(id, {
      isLatest: false,
    });

    // Log activity (non-blocking, only if admin has userId)
    try {
      if (adminProfile.userId) {
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: adminProfile.userId,
          action: "removed",
          entityType: "document",
          entityId: id,
          details: {
            fileName: document.fileName,
            documentType: documentType?.name,
            personName: person ? getFullName(person) : undefined,
            status: document.status,
            version: document.version,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

export const unlinkFromStatus = mutation({
  args: {
    id: v.id("documentsDelivered"),
  },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);

    const document = await ctx.db.get(id);
    if (!document) {
      throw new Error("Document not found");
    }

    if (!document.individualProcessStatusId) {
      throw new Error("Document is not linked to any status");
    }

    await ctx.db.patch(id, {
      individualProcessStatusId: undefined,
    });

    return id;
  },
});

/**
 * Toggle excludedFromReport flag on a document
 */
export const toggleExcludeFromReport = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
  },
  handler: async (ctx, { documentId }) => {
    await getCurrentUserProfile(ctx);

    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(documentId, {
      excludedFromReport: !document.excludedFromReport,
    });

    return documentId;
  },
});

/**
 * Toggle bypass conditions for a document (admin only)
 * When bypassed, all conditions are treated as fulfilled
 */
export const toggleBypassConditions = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
  },
  handler: async (ctx, { documentId }) => {
    await requireAdmin(ctx);

    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(documentId, {
      bypassConditions: !document.bypassConditions,
    });

    return documentId;
  },
});

/**
 * Bulk exclude from report all pending documents whose document type has excludeFromReportByDefault enabled
 */
export const bulkExcludeFromReportByDefault = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, { individualProcessId }) => {
    await getCurrentUserProfile(ctx);

    const documents = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", individualProcessId)
      )
      .collect();

    const latestDocs = documents.filter((doc) => doc.isLatest && doc.status === "not_started");

    let count = 0;
    for (const doc of latestDocs) {
      if (!doc.documentTypeId) continue;
      const documentType = await ctx.db.get(doc.documentTypeId);
      if (documentType?.excludeFromReportByDefault && !doc.excludedFromReport) {
        await ctx.db.patch(doc._id, { excludedFromReport: true });
        count++;
      }
    }

    return count;
  },
});

/**
 * Update version notes (observations) on an existing document
 * Allows adding/updating notes without uploading a file
 */
export const updateVersionNotes = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
    versionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Get individual process for access check
    const individualProcess = await ctx.db.get(document.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );
    if (!canAccessDocument(document, visibility)) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(args.documentId, {
      versionNotes: args.versionNotes,
    });

    return args.documentId;
  },
});

/**
 * Update the issue date of a delivered document version (admin only).
 * The document status is intentionally preserved.
 */
export const updateIssueDate = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
    issueDate: v.optional(v.string()),
  },
  returns: v.id("documentsDelivered"),
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);
    const issueDate = args.issueDate?.trim() || undefined;

    if (issueDate && !isValidIsoDate(issueDate)) {
      throw new ConvexError({
        code: "INVALID_ISSUE_DATE",
        message: "Issue date must be a valid date in YYYY-MM-DD format",
      });
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new ConvexError({
        code: "DOCUMENT_NOT_FOUND",
        message: "Document not found",
      });
    }

    if (document.issueDate === issueDate) {
      return document._id;
    }

    await ctx.db.patch(args.documentId, { issueDate });

    if (adminProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: adminProfile.userId,
        action: "issue_date_updated",
        entityType: "document",
        entityId: document._id,
        details: {
          fileName: document.fileName,
          version: document.version,
          changes: {
            issueDate: {
              before: document.issueDate ?? null,
              after: issueDate ?? null,
            },
          },
        },
      });
    }

    return document._id;
  },
});

/**
 * Correct the business receipt date of one document version (admin only).
 * File, status, review state, creation time and version flags stay immutable.
 */
export const updateReceivedAt = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
    receivedDate: v.string(),
  },
  returns: v.id("documentsDelivered"),
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new ConvexError({
        code: "DOCUMENT_NOT_FOUND",
        message: "Document not found",
      });
    }

    if (!hasDocumentContent(document)) {
      throw new ConvexError({
        code: "DOCUMENT_NOT_RECEIVED",
        message: "A receipt date can only be set after the document is received",
      });
    }

    const createdAt = getDocumentCreatedAt(document);
    const previousReceivedAt = getDocumentReceivedAt(document);
    const receivedAt = resolveDocumentReceivedAt({
      createdAt,
      requestedDate: args.receivedDate,
      userRole: "admin",
    });

    if (previousReceivedAt === receivedAt && document.createdAt !== undefined) {
      return document._id;
    }

    await ctx.db.patch(document._id, {
      createdAt,
      receivedAt,
      uploadedAt: receivedAt,
    });

    if (adminProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: adminProfile.userId,
        action: "received_date_updated",
        entityType: "document",
        entityId: document._id,
        details: {
          fileName: document.fileName,
          version: document.version,
          changes: {
            receivedAt: {
              before: previousReceivedAt ?? null,
              after: receivedAt,
            },
          },
        },
      });
    }

    return document._id;
  },
});

/**
 * Mutation to generate an upload URL for file uploads
 * Used by client and admin to upload documents
 */
export const generateUploadUrl = mutation(async (ctx) => {
  // Require authentication
  await getCurrentUserProfile(ctx);

  return await ctx.storage.generateUploadUrl();
});

/**
 * Query to get documents for bulk download (admin only)
 * Returns document metadata with file URLs for client-side zip generation
 */
export const getDocumentsForBulkDownload = query({
  args: {
    individualProcessIds: v.array(v.id("individualProcesses")),
    status: v.optional(v.string()),
    documentTypeId: v.optional(v.id("documentTypes")),
  },
  handler: async (ctx, args) => {
    // Require admin access
    const adminProfile = await requireAdmin(ctx);
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    const allDocuments: Array<{
      _id: Id<"documentsDelivered">;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      status: string;
      personName: string;
      documentTypeName: string;
      individualProcessId: Id<"individualProcesses">;
    }> = [];

    // Collect documents from all individual processes
    for (const processId of args.individualProcessIds) {
      const individualProcess = await cachedGet(processId);
      if (!individualProcess) {
        continue;
      }

      const person = await cachedGet(individualProcess.personId);
      const personName = person ? getFullName(person) : "Unknown";

      // Get documents for this individual process
      let documents = await ctx.db
        .query("documentsDelivered")
        .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", processId))
        .collect();

      // Filter to latest versions only
      documents = documents.filter((doc) => doc.isLatest);

      // Apply filters
      if (args.status) {
        documents = documents.filter((doc) => doc.status === args.status);
      }

      if (args.documentTypeId) {
        documents = documents.filter((doc) => doc.documentTypeId === args.documentTypeId);
      }

      // Enrich and add to results
      for (const doc of documents) {
        const documentType = doc.documentTypeId
          ? await cachedGet(doc.documentTypeId)
          : null;
        allDocuments.push({
          _id: doc._id,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          status: doc.status,
          personName: personName,
          documentTypeName: documentType?.name || "Unknown",
          individualProcessId: processId,
        });
      }
    }

    return allDocuments;
  },
});

/**
 * Bulk approve documents (admin only)
 */
export const bulkApprove = mutation({
  args: {
    documentIds: v.array(v.id("documentsDelivered")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

    const results = {
      successful: [] as Id<"documentsDelivered">[],
      failed: [] as { documentId: Id<"documentsDelivered">; reason: string }[],
      totalProcessed: args.documentIds.length,
    };

    // Process each document
    for (const documentId of args.documentIds) {
      try {
        const document = await ctx.db.get(documentId);
        if (!document) {
          results.failed.push({
            documentId,
            reason: "Document not found",
          });
          continue;
        }

        if (document.status === "approved") {
          results.failed.push({
            documentId,
            reason: "Document is already approved",
          });
          continue;
        }

        await ctx.db.patch(documentId, {
          status: "approved",
          reviewedBy: adminProfile.userId,
          reviewedAt: Date.now(),
          rejectionReason: undefined,
        });

        results.successful.push(documentId);

        // Send notification (non-blocking)
        try {
          const documentType = document.documentTypeId
            ? await ctx.db.get(document.documentTypeId)
            : null;
          const documentTypeName = documentType?.name || "Document";

          await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
            userId: document.uploadedBy,
            type: "document_approved",
            title: "Document Approved",
            message: `Your document "${documentTypeName}" has been approved`,
            entityType: "document",
            entityId: documentId,
          });
        } catch (error) {
          console.error("Failed to create notification:", error);
        }

        // Log activity (non-blocking, only if admin has userId)
        try {
          if (adminProfile.userId) {
            const [documentType, person] = await Promise.all([
              document.documentTypeId ? ctx.db.get(document.documentTypeId) : null,
              document.personId ? ctx.db.get(document.personId) : null,
            ]);

            await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
              userId: adminProfile.userId,
              action: "bulk_approved",
              entityType: "document",
              entityId: documentId,
              details: {
                fileName: document.fileName,
                documentType: documentType?.name,
                personName: person ? getFullName(person) : undefined,
                notes: args.notes,
              },
            });
          }
        } catch (error) {
          console.error("Failed to log activity:", error);
        }
      } catch (error) {
        results.failed.push({
          documentId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary (only if admin has userId)
    if (adminProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: adminProfile.userId,
        action: "bulk_approve_documents_completed",
        entityType: "document",
        entityId: "bulk",
        details: {
          totalProcessed: results.totalProcessed,
          successful: results.successful.length,
          failed: results.failed.length,
          notes: args.notes,
        },
      });
    }

    return results;
  },
});

/**
 * Bulk reject documents (admin only)
 */
export const bulkReject = mutation({
  args: {
    documentIds: v.array(v.id("documentsDelivered")),
    rejectionReason: v.string(),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

    if (!args.rejectionReason || args.rejectionReason.trim() === "") {
      throw new Error("Rejection reason is required");
    }

    const results = {
      successful: [] as Id<"documentsDelivered">[],
      failed: [] as { documentId: Id<"documentsDelivered">; reason: string }[],
      totalProcessed: args.documentIds.length,
    };

    // Process each document
    for (const documentId of args.documentIds) {
      try {
        const document = await ctx.db.get(documentId);
        if (!document) {
          results.failed.push({
            documentId,
            reason: "Document not found",
          });
          continue;
        }

        await ctx.db.patch(documentId, {
          status: "rejected",
          reviewedBy: adminProfile.userId,
          reviewedAt: Date.now(),
          rejectionReason: args.rejectionReason,
        });

        results.successful.push(documentId);

        // Send notification (non-blocking)
        try {
          const documentType = document.documentTypeId
            ? await ctx.db.get(document.documentTypeId)
            : null;
          const documentTypeName = documentType?.name || "Document";

          await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
            userId: document.uploadedBy,
            type: "document_rejected",
            title: "Document Rejected",
            message: `Your document "${documentTypeName}" was rejected: ${args.rejectionReason}`,
            entityType: "document",
            entityId: documentId,
          });
        } catch (error) {
          console.error("Failed to create notification:", error);
        }

        // Log activity (non-blocking, only if admin has userId)
        try {
          if (adminProfile.userId) {
            const [documentType, person] = await Promise.all([
              document.documentTypeId ? ctx.db.get(document.documentTypeId) : null,
              document.personId ? ctx.db.get(document.personId) : null,
            ]);

            await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
              userId: adminProfile.userId,
              action: "bulk_rejected",
              entityType: "document",
              entityId: documentId,
              details: {
                fileName: document.fileName,
                documentType: documentType?.name,
                personName: person ? getFullName(person) : undefined,
                rejectionReason: args.rejectionReason,
              },
            });
          }
        } catch (error) {
          console.error("Failed to log activity:", error);
        }
      } catch (error) {
        results.failed.push({
          documentId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary (only if admin has userId)
    if (adminProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: adminProfile.userId,
        action: "bulk_reject_documents_completed",
        entityType: "document",
        entityId: "bulk",
        details: {
          totalProcessed: results.totalProcessed,
          successful: results.successful.length,
          failed: results.failed.length,
          rejectionReason: args.rejectionReason,
        },
      });
    }

    return results;
  },
});

/**
 * Bulk delete documents (admin only)
 */
export const bulkDelete = mutation({
  args: {
    documentIds: v.array(v.id("documentsDelivered")),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

    const results = {
      successful: [] as Id<"documentsDelivered">[],
      failed: [] as { documentId: Id<"documentsDelivered">; reason: string }[],
      totalProcessed: args.documentIds.length,
    };

    // Process each document
    for (const documentId of args.documentIds) {
      try {
        const document = await ctx.db.get(documentId);
        if (!document) {
          results.failed.push({
            documentId,
            reason: "Document not found",
          });
          continue;
        }

        // Safety check: prevent deletion of approved documents
        if (document.status === "approved") {
          results.failed.push({
            documentId,
            reason: "Cannot delete approved documents. Please reject first if needed.",
          });
          continue;
        }

        // Get related data before delete for logging
        const [documentType, person] = await Promise.all([
          document.documentTypeId ? ctx.db.get(document.documentTypeId) : null,
          document.personId ? ctx.db.get(document.personId) : null,
        ]);

        // Soft delete by marking as not latest
        await ctx.db.patch(documentId, {
          isLatest: false,
        });

        results.successful.push(documentId);

        // Log activity (non-blocking, only if admin has userId)
        try {
          if (adminProfile.userId) {
            await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
              userId: adminProfile.userId,
              action: "bulk_deleted",
              entityType: "document",
              entityId: documentId,
              details: {
                fileName: document.fileName,
                documentType: documentType?.name,
                personName: person ? getFullName(person) : undefined,
                status: document.status,
                version: document.version,
              },
            });
          }
        } catch (error) {
          console.error("Failed to log activity:", error);
        }
      } catch (error) {
        results.failed.push({
          documentId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary (only if admin has userId)
    if (adminProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: adminProfile.userId,
        action: "bulk_delete_documents_completed",
        entityType: "document",
        entityId: "bulk",
        details: {
          totalProcessed: results.totalProcessed,
          successful: results.successful.length,
          failed: results.failed.length,
        },
      });
    }

    return results;
  },
});

/**
 * Upload a loose document (without document type)
 * Creates a document entry that can later be assigned a type
 */
export const uploadLoose = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    versionNotes: v.optional(v.string()),
    individualProcessStatusId: v.optional(v.id("individualProcessStatuses")),
    documentName: v.optional(v.string()),
    autoApprove: v.optional(v.boolean()),
    receivedDate: v.optional(v.string()),
  },
  returns: v.id("documentsDelivered"),
  handler: async (ctx, args) => {
    // Require admin role when auto-approving
    let userProfile;
    if (args.autoApprove) {
      userProfile = await requireAdmin(ctx);
    } else {
      userProfile = await getCurrentUserProfile(ctx);
    }

    // Get individual process to check access
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);

    if (!userProfile.userId) {
      throw new Error("User profile must be activated before uploading documents");
    }
    const uploaderUserId = userProfile.userId;

    // Validate that status entry belongs to the same process (if provided)
    if (args.individualProcessStatusId) {
      const statusEntry = await ctx.db.get(args.individualProcessStatusId);
      if (!statusEntry) {
        throw new Error("Status entry not found");
      }
      if (statusEntry.individualProcessId !== args.individualProcessId) {
        throw new Error("Status entry does not belong to this process");
      }
    }

    // Determine if saving with or without file
    const hasFile = !!args.storageId;

    if (!hasFile && !args.documentName) {
      throw new Error("Either a file or a document name must be provided");
    }

    let fileUrl = "";
    if (hasFile) {
      fileUrl = (await ctx.storage.getUrl(args.storageId!)) || "";
      if (!fileUrl) {
        throw new Error("Failed to get file URL from storage");
      }
    }

    // Determine status based on auto-approve
    const shouldAutoApprove = args.autoApprove === true && hasFile;
    const status = shouldAutoApprove ? "approved" : (hasFile ? "uploaded" : "not_started");
    const initialVersion = 1;
    const createdAt = Date.now();
    const receivedAt = hasFile
      ? resolveDocumentReceivedAt({
          createdAt,
          requestedDate: args.receivedDate,
          userRole: userProfile.role,
        })
      : undefined;
    const uploadedAt = receivedAt ?? createdAt;
    const processStatusAtUpload = hasFile
      ? await getProcessStatusAtUpload(ctx, individualProcess)
      : undefined;

    // Create document without type (loose document)
    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: args.individualProcessId,
      // documentTypeId is undefined - this is a loose document
      personId: individualProcess.personId,
      companyId: collectiveProcess?.companyId,
      storageId: args.storageId,
      fileName: hasFile ? args.fileName! : (args.documentName || ""),
      fileUrl,
      fileSize: hasFile ? args.fileSize! : 0,
      mimeType: hasFile ? args.mimeType! : "",
      status,
      uploadedBy: uploaderUserId,
      uploadedAt,
      createdAt,
      receivedAt,
      ...(shouldAutoApprove ? { reviewedBy: uploaderUserId, reviewedAt: uploadedAt } : {}),
      expiryDate: args.expiryDate,
      issueDate: args.issueDate,
      version: initialVersion,
      isLatest: true,
      versionNotes: args.versionNotes,
      processStatusAtUpload,
      individualProcessStatusId: args.individualProcessStatusId,
      documentName: args.documentName,
    });

    // Create status history for auto-approved documents
    if (shouldAutoApprove) {
      await ctx.db.insert("documentStatusHistory", {
        documentId,
        previousStatus: "uploaded",
        newStatus: "approved",
        changedBy: uploaderUserId,
        changedAt: Date.now(),
        metadata: {
          fileName: args.fileName,
          version: initialVersion,
        },
      });
    }

    // Log activity
    try {
      const person = await ctx.db.get(individualProcess.personId);

      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: uploaderUserId,
        action: "uploaded_loose",
        entityType: "document",
        entityId: documentId,
        details: {
          fileName: args.fileName,
          fileSize: args.fileSize,
          personName: person ? getFullName(person) : undefined,
          collectiveProcessReference: collectiveProcess?.referenceNumber,
          isLooseDocument: true,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return documentId;
  },
});

/**
 * Upload a document with a specific document type
 * Validates file type and size against document type constraints
 */
export const uploadWithType = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    documentTypeId: v.id("documentTypes"),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    versionNotes: v.optional(v.string()),
    preFulfilledConditionIds: v.optional(
      v.array(v.id("documentTypeConditions"))
    ),
    individualProcessStatusId: v.optional(v.id("individualProcessStatuses")),
    autoApprove: v.optional(v.boolean()),
    bypassConditions: v.optional(v.boolean()),
    receivedDate: v.optional(v.string()),
  },
  returns: v.id("documentsDelivered"),
  handler: async (ctx, args) => {
    // Require admin role when auto-approving or bypassing conditions
    let userProfile;
    if (args.autoApprove || args.bypassConditions) {
      userProfile = await requireAdmin(ctx);
    } else {
      userProfile = await getCurrentUserProfile(ctx);
    }

    // Get individual process
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);

    if (!userProfile.userId) {
      throw new Error("User profile must be activated before uploading documents");
    }
    const uploaderUserId = userProfile.userId;

    // Validate that status entry belongs to the same process (if provided)
    if (args.individualProcessStatusId) {
      const statusEntry = await ctx.db.get(args.individualProcessStatusId);
      if (!statusEntry) {
        throw new Error("Status entry not found");
      }
      if (statusEntry.individualProcessId !== args.individualProcessId) {
        throw new Error("Status entry does not belong to this process");
      }
    }

    // Get document type and validate constraints
    const documentType = await ctx.db.get(args.documentTypeId);
    if (!documentType) {
      throw new Error("Document type not found");
    }

    if (!documentType.isActive) {
      throw new Error("Document type is not active");
    }

    const hasFile = !!args.storageId;

    // Only validate file constraints when a file is provided
    if (hasFile) {
      // Validate file type if constraints exist
      if (documentType.allowedFileTypes && documentType.allowedFileTypes.length > 0 && args.fileName) {
        const fileExtension = args.fileName.substring(args.fileName.lastIndexOf(".")).toLowerCase();
        const isAllowed = documentType.allowedFileTypes.some(
          (allowed) => allowed.toLowerCase() === fileExtension
        );
        if (!isAllowed) {
          throw new Error(
            `File type not allowed. Allowed types: ${documentType.allowedFileTypes.join(", ")}`
          );
        }
      }

      // Validate file size if constraint exists
      if (documentType.maxFileSizeMB && args.fileSize) {
        const fileSizeMB = args.fileSize / (1024 * 1024);
        if (fileSizeMB > documentType.maxFileSizeMB) {
          throw new Error(
            `File size exceeds maximum allowed (${documentType.maxFileSizeMB}MB)`
          );
        }
      }
    }

    let fileUrl = "";
    if (hasFile) {
      fileUrl = (await ctx.storage.getUrl(args.storageId!)) || "";
      if (!fileUrl) {
        throw new Error("Failed to get file URL from storage");
      }
    }

    // Check for existing document of same type
    const allTypeDocs = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", args.individualProcessId))
      .collect();

    const allMatchingTypeDocs = allTypeDocs.filter(
      (doc) => doc.documentTypeId === args.documentTypeId
    );

    let version = 1;
    const currentLatestTyped = allMatchingTypeDocs.find((doc) => doc.isLatest);

    if (allMatchingTypeDocs.length > 0) {
      // Calculate version from MAX of all versions to avoid duplicates
      version = Math.max(...allMatchingTypeDocs.map((doc) => doc.version)) + 1;

      // Mark the current latest as not latest
      if (currentLatestTyped) {
        await ctx.db.patch(currentLatestTyped._id, {
          isLatest: false,
        });
      }
    }

    // Determine status based on auto-approve
    let canAutoApprove = args.autoApprove === true && hasFile;

    // Check conditions — if required conditions are unfulfilled, skip auto-approve (unless bypassed)
    if (canAutoApprove && !args.bypassConditions) {
      const conditionLinks = await ctx.db
        .query("documentTypeConditionLinks")
        .withIndex("by_documentType", (q) =>
          q.eq("documentTypeId", args.documentTypeId)
        )
        .collect();

      if (conditionLinks.length > 0) {
        const preFulfilledSet = new Set(args.preFulfilledConditionIds || []);
        for (const link of conditionLinks) {
          if (!link.isRequired) continue;
          const condition = await ctx.db.get(link.documentTypeConditionId);
          if (condition && condition.isActive && !preFulfilledSet.has(condition._id)) {
            canAutoApprove = false;
            break;
          }
        }
      }
    }

    const status = canAutoApprove ? "approved" : (hasFile ? "uploaded" : "not_started");
    const createdAt = Date.now();
    const receivedAt = hasFile
      ? resolveDocumentReceivedAt({
          createdAt,
          requestedDate: args.receivedDate,
          userRole: userProfile.role,
        })
      : undefined;
    const uploadedAt = receivedAt ?? createdAt;
    const processStatusAtUpload = hasFile
      ? await getProcessStatusAtUpload(ctx, individualProcess)
      : undefined;

    // Create document with type
    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: args.individualProcessId,
      documentTypeId: args.documentTypeId,
      personId: individualProcess.personId,
      companyId: collectiveProcess?.companyId,
      storageId: args.storageId,
      fileName: hasFile ? (args.fileName || "") : (documentType.name || ""),
      fileUrl,
      fileSize: hasFile ? (args.fileSize || 0) : 0,
      mimeType: hasFile ? (args.mimeType || "") : "",
      status,
      uploadedBy: uploaderUserId,
      uploadedAt,
      createdAt,
      receivedAt,
      ...(canAutoApprove ? { reviewedBy: uploaderUserId, reviewedAt: uploadedAt } : {}),
      bypassConditions: args.bypassConditions || undefined,
      expiryDate: args.expiryDate,
      issueDate: args.issueDate,
      version: version,
      isLatest: true,
      isRequired: false, // Manual uploads with type are optional by default
      versionNotes: args.versionNotes,
      processStatusAtUpload,
      individualProcessStatusId: args.individualProcessStatusId,
      excludedFromReport: documentType.excludeFromReportByDefault || undefined,
    });

    // Create status history for auto-approved documents
    if (canAutoApprove) {
      await ctx.db.insert("documentStatusHistory", {
        documentId,
        previousStatus: "uploaded",
        newStatus: "approved",
        changedBy: uploaderUserId,
        changedAt: Date.now(),
        metadata: {
          fileName: args.fileName,
          version,
        },
      });
    }

    // Auto-create conditions for this document based on document type
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.documentDeliveredConditions.autoCreateForDocument,
        {
          documentsDeliveredId: documentId,
          documentTypeId: args.documentTypeId,
          individualProcessId: args.individualProcessId,
          preFulfilledConditionIds: args.preFulfilledConditionIds,
          previousDocumentsDeliveredId: currentLatestTyped?._id,
        }
      );
    } catch (error) {
      console.error("Failed to auto-create conditions:", error);
    }

    // Log activity
    try {
      const person = await ctx.db.get(individualProcess.personId);

      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: uploaderUserId,
        action: "uploaded_with_type",
        entityType: "document",
        entityId: documentId,
        details: {
          fileName: args.fileName,
          fileSize: args.fileSize,
          documentType: documentType.name,
          personName: person ? getFullName(person) : undefined,
          collectiveProcessReference: collectiveProcess?.referenceNumber,
          version,
          isReplacement: version > 1,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return documentId;
  },
});

/**
 * Assign a document type to a loose document
 * Converts an untyped document to a typed one
 */
export const assignType = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
    documentTypeId: v.id("documentTypes"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Check if it's a loose document
    if (document.documentTypeId) {
      throw new Error("Document already has a type assigned");
    }

    // Get individual process for access check
    const individualProcess = await ctx.db.get(document.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);

    // Get document type
    const documentType = await ctx.db.get(args.documentTypeId);
    if (!documentType) {
      throw new Error("Document type not found");
    }

    if (!documentType.isActive) {
      throw new Error("Document type is not active");
    }

    // Validate file type if constraints exist
    if (documentType.allowedFileTypes && documentType.allowedFileTypes.length > 0) {
      const fileExtension = document.fileName.substring(document.fileName.lastIndexOf(".")).toLowerCase();
      const isAllowed = documentType.allowedFileTypes.some(
        (allowed) => allowed.toLowerCase() === fileExtension
      );
      if (!isAllowed) {
        throw new Error(
          `File type not allowed for this document type. Allowed types: ${documentType.allowedFileTypes.join(", ")}`
        );
      }
    }

    // Validate file size if constraint exists
    if (documentType.maxFileSizeMB) {
      const fileSizeMB = document.fileSize / (1024 * 1024);
      if (fileSizeMB > documentType.maxFileSizeMB) {
        throw new Error(
          `File size exceeds maximum allowed for this document type (${documentType.maxFileSizeMB}MB)`
        );
      }
    }

    // Update document with type
    await ctx.db.patch(args.documentId, {
      documentTypeId: args.documentTypeId,
    });

    // Log activity
    try {
      if (userProfile.userId) {
        const person = await ctx.db.get(individualProcess.personId);

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: "assigned_type",
          entityType: "document",
          entityId: args.documentId,
          details: {
            fileName: document.fileName,
            documentType: documentType.name,
            personName: person ? getFullName(person) : undefined,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return args.documentId;
  },
});

/**
 * Upload file for a pre-populated pending document
 * Used when documents are auto-generated and waiting for upload
 */
export const uploadForPending = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    expiryDate: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    versionNotes: v.optional(v.string()),
    autoApprove: v.optional(v.boolean()),
    receivedDate: v.optional(v.string()),
  },
  returns: v.id("documentsDelivered"),
  handler: async (ctx, args) => {
    // Require admin role when auto-approving
    let userProfile;
    if (args.autoApprove) {
      userProfile = await requireAdmin(ctx);
    } else {
      userProfile = await getCurrentUserProfile(ctx);
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Must be a missing document or a rejected latest document being resubmitted.
    const isRejectedResubmission = document.status === "rejected";
    if (document.status !== "not_started" && !isRejectedResubmission) {
      throw new Error("Document already has a file uploaded");
    }

    // Get individual process for access check
    const individualProcess = await ctx.db.get(document.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    // Check access control — handles client access via any of the company linkages
    // (companyApplicantId, userApplicantCompanyId, collectiveProcess.companyId)
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );
    if (!canAccessDocument(document, visibility)) {
      throw new Error("Document not found");
    }

    if (!userProfile.userId) {
      throw new Error("User profile must be activated before uploading documents");
    }
    const uploaderUserId = userProfile.userId;

    // Validate against document type if it exists
    if (document.documentTypeId) {
      const documentType = await ctx.db.get(document.documentTypeId);
      if (documentType) {
        // Validate file type if constraints exist
        if (documentType.allowedFileTypes && documentType.allowedFileTypes.length > 0) {
          const fileExtension = args.fileName.substring(args.fileName.lastIndexOf(".")).toLowerCase();
          const isAllowed = documentType.allowedFileTypes.some(
            (allowed) => allowed.toLowerCase() === fileExtension
          );
          if (!isAllowed) {
            throw new Error(
              `File type not allowed. Allowed types: ${documentType.allowedFileTypes.join(", ")}`
            );
          }
        }

        // Validate file size if constraint exists
        if (documentType.maxFileSizeMB) {
          const fileSizeMB = args.fileSize / (1024 * 1024);
          if (fileSizeMB > documentType.maxFileSizeMB) {
            throw new Error(
              `File size exceeds maximum allowed (${documentType.maxFileSizeMB}MB)`
            );
          }
        }
      }
    }

    // Get file URL from storage
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) {
      throw new Error("Failed to get file URL from storage");
    }

    // Determine status based on auto-approve
    const shouldAutoApprove = args.autoApprove === true;
    const status = shouldAutoApprove ? "approved" : "uploaded";
    const now = Date.now();
    const createdAt = isRejectedResubmission
      ? now
      : getDocumentCreatedAt(document);
    const receivedAt = resolveDocumentReceivedAt({
      createdAt,
      requestedDate: args.receivedDate,
      userRole: userProfile.role,
      now,
    });
    const uploadedAt = receivedAt;
    const processStatusAtUpload = await getProcessStatusAtUpload(ctx, individualProcess);
    let savedDocumentId = args.documentId;
    let newVersion = document.version === 0 ? 1 : document.version;

    if (isRejectedResubmission) {
      const allProcessDocs = await ctx.db
        .query("documentsDelivered")
        .withIndex("by_individualProcess", (q) =>
          q.eq("individualProcessId", document.individualProcessId)
        )
        .collect();
      const matchingDocs = allProcessDocs.filter(
        (doc) =>
          doc.documentTypeId === document.documentTypeId &&
          doc.documentRequirementId === document.documentRequirementId &&
          doc.documentTypeLegalFrameworkId === document.documentTypeLegalFrameworkId
      );
      newVersion = Math.max(...matchingDocs.map((doc) => doc.version)) + 1;

      await ctx.db.patch(args.documentId, { isLatest: false });
      savedDocumentId = await ctx.db.insert("documentsDelivered", {
        individualProcessId: document.individualProcessId,
        documentTypeId: document.documentTypeId,
        documentRequirementId: document.documentRequirementId,
        documentTypeLegalFrameworkId: document.documentTypeLegalFrameworkId,
        isRequired: document.isRequired,
        personId: document.personId ?? individualProcess.personId,
        companyId: document.companyId ?? collectiveProcess?.companyId,
        storageId: args.storageId,
        fileName: args.fileName,
        fileUrl,
        fileSize: args.fileSize,
        mimeType: args.mimeType,
        status,
        uploadedBy: uploaderUserId,
        uploadedAt,
        createdAt,
        receivedAt,
        ...(shouldAutoApprove ? { reviewedBy: uploaderUserId, reviewedAt: uploadedAt } : {}),
        expiryDate: args.expiryDate,
        issueDate: args.issueDate,
        versionNotes: args.versionNotes,
        version: newVersion,
        isLatest: true,
        processStatusAtUpload,
        reusedFromDocumentId: document.reusedFromDocumentId,
        individualProcessStatusId: document.individualProcessStatusId,
        documentName: document.documentName,
        excludedFromReport: document.excludedFromReport,
      });
    } else {
      // Bump version 0 (placeholder) → 1 on first fill; preserve existing for higher placeholders
      await ctx.db.patch(args.documentId, {
        storageId: args.storageId,
        fileName: args.fileName,
        fileUrl: fileUrl,
        fileSize: args.fileSize,
        mimeType: args.mimeType,
        status,
        uploadedBy: uploaderUserId,
        uploadedAt,
        createdAt,
        receivedAt,
        ...(shouldAutoApprove ? { reviewedBy: uploaderUserId, reviewedAt: uploadedAt } : {}),
        expiryDate: args.expiryDate,
        issueDate: args.issueDate,
        versionNotes: args.versionNotes,
        version: newVersion,
        processStatusAtUpload: document.processStatusAtUpload ?? processStatusAtUpload,
      });
    }

    // Create status history for auto-approved documents
    if (shouldAutoApprove) {
      await ctx.db.insert("documentStatusHistory", {
        documentId: savedDocumentId,
        previousStatus: document.status,
        newStatus: "approved",
        changedBy: uploaderUserId,
        changedAt: Date.now(),
        metadata: {
          fileName: args.fileName,
          version: newVersion,
        },
      });
    }

    // Auto-create conditions for this document based on document type
    // Check if conditions already exist (from prior creation of pending document)
    if (document.documentTypeId) {
      const existingConditions = await ctx.db
        .query("documentDeliveredConditions")
        .withIndex("by_documentDelivered", (q) =>
          q.eq("documentsDeliveredId", savedDocumentId)
        )
        .first();

      // Only create conditions if none exist yet
      if (!existingConditions) {
        try {
          await ctx.scheduler.runAfter(
            0,
            internal.documentDeliveredConditions.autoCreateForDocument,
            {
              documentsDeliveredId: savedDocumentId,
              documentTypeId: document.documentTypeId,
              individualProcessId: document.individualProcessId,
              previousDocumentsDeliveredId: isRejectedResubmission ? args.documentId : undefined,
            }
          );
        } catch (error) {
          console.error("Failed to auto-create conditions:", error);
        }
      }
    }

    // Log activity
    try {
      const person = await ctx.db.get(individualProcess.personId);
      const documentType = document.documentTypeId
        ? await ctx.db.get(document.documentTypeId)
        : null;

      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: uploaderUserId,
        action: "uploaded_pending",
        entityType: "document",
        entityId: savedDocumentId,
        details: {
          fileName: args.fileName,
          fileSize: args.fileSize,
          documentType: documentType?.name,
          personName: person ? getFullName(person) : undefined,
          collectiveProcessReference: collectiveProcess?.referenceNumber,
          isRequired: document.isRequired,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    // Notify all admins when a client uploads a document
    if (userProfile.role === "client" && !shouldAutoApprove) {
      try {
        const [person, documentType, admins] = await Promise.all([
          ctx.db.get(individualProcess.personId),
          document.documentTypeId ? ctx.db.get(document.documentTypeId) : null,
          ctx.db
            .query("userProfiles")
            .withIndex("by_role", (q) => q.eq("role", "admin"))
            .collect(),
        ]);

        const docName = documentType?.name || document.documentName || args.fileName;
        const personName = person ? getFullName(person) : "candidato";
        const clientName = userProfile.fullName || "Cliente";

        for (const admin of admins) {
          if (!admin.userId || !admin.isActive) continue;
          await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
            userId: admin.userId,
            type: "client_document_uploaded",
            title: "Cliente enviou um documento",
            message: `${clientName} enviou "${docName}" no processo de ${personName}`,
            entityType: "individualProcess",
            entityId: document.individualProcessId,
          });
        }
      } catch (error) {
        console.error("Failed to notify admins of client upload:", error);
      }
    }

    return savedDocumentId;
  },
});

/**
 * List documents grouped by category
 * Returns documents separated into: required, optional, and loose
 */
export const listGroupedByCategory = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
    includeOtherDocuments: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { individualProcessId, includeOtherDocuments = false },
  ) => {
    // Get individual process to check access
    const individualProcess = await ctx.db.get(individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const userProfile = await getCurrentUserProfile(ctx);
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await cachedGet(individualProcess.collectiveProcessId)
      : null;

    // Get all latest documents for this process
    let documents = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", individualProcessId))
      .collect();

    documents = documents.filter((doc) => doc.isLatest);
    const checklistVisibility = filterClientChecklistDocuments(
      documents,
      visibility,
      includeOtherDocuments,
    );
    documents = checklistVisibility.documents;

    // Enrich with related data
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const documentType = doc.documentTypeId
          ? await cachedGet(doc.documentTypeId)
          : null;
        const documentRequirement = doc.documentRequirementId
          ? await cachedGet(doc.documentRequirementId)
          : null;
        const uploadedByUser = doc.uploadedBy
          ? await cachedGet(doc.uploadedBy)
          : null;
        const reviewedByUser = doc.reviewedBy
          ? await cachedGet(doc.reviewedBy)
          : null;

        // Compute validity check if association exists
        let validityCheck = undefined;
        let validityRule = undefined;
        if (doc.documentTypeLegalFrameworkId) {
          const association = await cachedGet(doc.documentTypeLegalFrameworkId);
          if (association) {
            if (association.validityType && association.validityDays) {
              validityRule = {
                validityType: association.validityType,
                validityDays: association.validityDays,
              };
              validityCheck = checkDocumentValidity(
                association.validityType,
                association.validityDays,
                doc.issueDate,
                doc.expiryDate,
              );
            }
          }
        }

        // Compute conditions summary if document has been started
        let conditionsSummary = undefined;
        if (doc.status !== "not_started") {
          const docConditions = await ctx.db
            .query("documentDeliveredConditions")
            .withIndex("by_documentDelivered", (q) =>
              q.eq("documentsDeliveredId", doc._id)
            )
            .collect();

          if (docConditions.length > 0) {
            const conditions = await Promise.all(
              docConditions.map(async (dc) => {
                const condition = await cachedGet(dc.documentTypeConditionId);
                return {
                  name: condition?.name ?? "",
                  isFulfilled: dc.isFulfilled,
                };
              })
            );
            conditionsSummary = {
              total: conditions.length,
              fulfilled: conditions.filter((c) => c.isFulfilled).length,
              conditions,
            };
          }
        } else if (doc.documentTypeId) {
          // For not_started documents, derive conditions from the document type definition
          const conditionLinks = await ctx.db
            .query("documentTypeConditionLinks")
            .withIndex("by_documentType", (q) =>
              q.eq("documentTypeId", doc.documentTypeId!)
            )
            .collect();

          if (conditionLinks.length > 0) {
            const conditions: Array<{ name: string; isFulfilled: boolean }> = [];
            for (const link of conditionLinks) {
              const condition = await cachedGet(link.documentTypeConditionId);
              if (condition && condition.isActive) {
                conditions.push({ name: condition.name, isFulfilled: false });
              }
            }
            if (conditions.length > 0) {
              conditionsSummary = {
                total: conditions.length,
                fulfilled: 0,
                conditions,
              };
            }
          }
        }

        // Override conditions summary when bypass is active
        if (doc.bypassConditions && conditionsSummary) {
          conditionsSummary = {
            ...conditionsSummary,
            fulfilled: conditionsSummary.total,
            conditions: conditionsSummary.conditions.map((c: { name: string; isFulfilled: boolean }) => ({ ...c, isFulfilled: true })),
            bypassed: true,
          };
        }

        // For info-only documents, fetch field values summary
        let infoFieldValues: string[] | undefined = undefined;
        if (documentType?.isInformationOnly && doc.status !== "not_started") {
          const person = await cachedGet(individualProcess.personId);
          const passport = individualProcess.passportId
            ? await cachedGet(individualProcess.passportId)
            : null;
          let company: any = null;
          if (individualProcess.companyApplicantId) {
            company = await cachedGet(individualProcess.companyApplicantId);
          } else if (collectiveProcess?.companyId) {
            company = await cachedGet(collectiveProcess.companyId);
          }

          const fieldMappings = await ctx.db
            .query("documentTypeFieldMappings")
            .withIndex("by_documentType", (q) =>
              q.eq("documentTypeId", doc.documentTypeId!)
            )
            .collect();

          const activeFields = fieldMappings
            .filter((m) => m.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          const entities: Record<string, any> = {
            person,
            individualProcess,
            passport,
            company,
          };

          infoFieldValues = activeFields
            .map((f) => {
              const val = entities[f.entityType]?.[f.fieldPath];
              return val != null && val !== "" ? String(val) : null;
            })
            .filter((v): v is string => v !== null);
        }

        // Find previous version's rejection reason (exigência reason)
        let previousRejectionReason: string | undefined;
        if (doc.version > 1 && doc.individualProcessStatusId) {
          const previousVersion = await ctx.db
            .query("documentsDelivered")
            .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", individualProcessId))
            .filter((q) =>
              q.and(
                q.eq(q.field("documentTypeId"), doc.documentTypeId),
                q.eq(q.field("version"), doc.version - 1)
              )
            )
            .first();
          previousRejectionReason = previousVersion?.rejectionReason;
        }

        // Enrich linked status
        let linkedStatus = undefined;
        if (doc.individualProcessStatusId) {
          const statusEntry = await cachedGet(doc.individualProcessStatusId);
          if (statusEntry) {
            const caseStatus = await cachedGet(statusEntry.caseStatusId);
            if (caseStatus) {
              linkedStatus = {
                caseStatusName: caseStatus.name,
                caseStatusCode: caseStatus.code,
                caseStatusColor: caseStatus.color,
                date: statusEntry.date,
                clientDeadlineDate: statusEntry.clientDeadlineDate,
                individualProcessStatusId: doc.individualProcessStatusId!,
              };
            }
          }
        }

        return {
          ...projectDocumentForViewer(doc, userProfile.role),
          documentType,
          documentRequirement,
          uploadedByUser,
          reviewedByUser,
          validityCheck,
          validityRule,
          conditionsSummary,
          infoFieldValues,
          linkedStatus,
          previousRejectionReason,
        };
      }),
    );

    // Group by category
    const required = enrichedDocuments.filter(
      (doc) => doc.isRequired === true && doc.documentTypeId
    );
    // Treat documents with isRequired === false OR undefined as optional (when they have a type)
    const optional = enrichedDocuments.filter(
      (doc) => doc.isRequired !== true && doc.documentTypeId
    );
    const loose = enrichedDocuments.filter(
      (doc) => !doc.documentTypeId
    );

    return {
      required,
      optional,
      loose,
      companyApplicantId: individualProcess.companyApplicantId,
      visibility: {
        accessScope: visibility.accessScope,
        isCurrentExigencia: visibility.isCurrentExigencia,
        currentExigenciaStatusId: visibility.currentExigenciaStatusId,
        canToggleOtherDocuments:
          visibility.viewerRole === "client" &&
          visibility.hasFullDocumentAccess &&
          visibility.currentExigenciaStatusId !== undefined &&
          checklistVisibility.otherDocumentCount > 0,
        hiddenDocumentCount: checklistVisibility.hiddenDocumentCount,
        otherDocumentCount: checklistVisibility.otherDocumentCount,
        showingOtherDocuments: checklistVisibility.showingOtherDocuments,
      },
      summary: {
        totalRequired: required.length,
        totalOptional: optional.length,
        totalLoose: loose.length,
        requiredUploaded: required.filter((d) => d.status !== "not_started").length,
        requiredApproved: required.filter((d) => d.status === "approved").length,
        optionalUploaded: optional.filter((d) => d.status !== "not_started").length,
        optionalApproved: optional.filter((d) => d.status === "approved").length,
      },
    };
  },
});

/**
 * Query to get status history of a document
 * Returns all status changes sorted by date descending (newest first)
 */
export const getStatusHistory = query({
  args: {
    documentId: v.id("documentsDelivered"),
  },
  handler: async (ctx, { documentId }) => {
    // Get document to check access
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Get individual process for access control
    const individualProcess = await ctx.db.get(document.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const userProfile = await requireAdmin(ctx);
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );
    if (!canAccessDocument(document, visibility)) {
      throw new Error("Document not found");
    }
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Get all status history entries
    const history = await ctx.db
      .query("documentStatusHistory")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .order("desc")
      .collect();

    // Enrich with user information
    const enrichedHistory = await Promise.all(
      history.map(async (entry) => {
        const changedByUser = await cachedGet(entry.changedBy);
        let changedByProfile = null;
        if (changedByUser) {
          changedByProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", changedByUser._id))
            .first();
        }

        return {
          ...entry,
          changedByUser,
          changedByProfile,
        };
      })
    );

    return enrichedHistory;
  },
});

/**
 * Mutation to change document status (admin only)
 * Allows changing to any valid status and records history
 */
export const changeStatus = mutation({
  args: {
    id: v.id("documentsDelivered"),
    newStatus: v.union(
      v.literal("uploaded"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, newStatus, notes }) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

    const document = await ctx.db.get(id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Can't change status of not_started documents (need to upload first)
    if (document.status === "not_started") {
      throw new Error("Cannot change status of a document that hasn't been uploaded yet");
    }

    const previousStatus = document.status;

    // If status is the same, do nothing
    if (previousStatus === newStatus) {
      return id;
    }

    // Update document status
    await ctx.db.patch(id, {
      status: newStatus,
      reviewedBy: adminProfile.userId,
      reviewedAt: Date.now(),
      rejectionReason: newStatus === "rejected" ? notes : undefined,
    });

    // Record status history
    await ctx.db.insert("documentStatusHistory", {
      documentId: id,
      previousStatus: previousStatus,
      newStatus: newStatus,
      changedBy: adminProfile.userId!,
      changedAt: Date.now(),
      notes: notes,
      metadata: {
        fileName: document.fileName,
        version: document.version,
      },
    });

    // Send notification to document uploader
    try {
      const documentType = document.documentTypeId
        ? await ctx.db.get(document.documentTypeId)
        : null;
      const documentTypeName = documentType?.name || "Document";

      let notificationType = "document_status_changed";
      let notificationTitle = "Document Status Changed";
      let notificationMessage = `Your document "${documentTypeName}" status changed to ${newStatus}`;

      if (newStatus === "approved") {
        notificationType = "document_approved";
        notificationTitle = "Document Approved";
        notificationMessage = `Your document "${documentTypeName}" has been approved`;
      } else if (newStatus === "rejected") {
        notificationType = "document_rejected";
        notificationTitle = "Document Rejected";
        notificationMessage = notes
          ? `Your document "${documentTypeName}" was rejected: ${notes}`
          : `Your document "${documentTypeName}" was rejected`;
      }

      await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
        userId: document.uploadedBy,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        entityType: "document",
        entityId: id,
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
    }

    // Log activity
    try {
      if (adminProfile.userId) {
        const [individualProcess, documentType, person] = await Promise.all([
          ctx.db.get(document.individualProcessId),
          document.documentTypeId ? ctx.db.get(document.documentTypeId) : null,
          document.personId ? ctx.db.get(document.personId) : null,
        ]);

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: adminProfile.userId,
          action: "status_changed",
          entityType: "document",
          entityId: id,
          details: {
            fileName: document.fileName,
            documentType: documentType?.name,
            personName: person ? getFullName(person) : undefined,
            previousStatus,
            newStatus,
            notes,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Query to list company documents available for reuse
 * Finds documents of the same type from other processes of the same company
 */
export const listCompanyDocumentsForReuse = query({
  args: {
    companyApplicantId: v.id("companies"),
    documentTypeId: v.id("documentTypes"),
    excludeProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, { companyApplicantId, documentTypeId, excludeProcessId }) => {
    await requireAdmin(ctx);

    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);
    // Find all individual processes for this company
    const processes = await ctx.db
      .query("individualProcesses")
      .withIndex("by_companyApplicant", (q) => q.eq("companyApplicantId", companyApplicantId))
      .collect();

    // Exclude current process
    const otherProcesses = processes.filter((p) => p._id !== excludeProcessId);

    if (otherProcesses.length === 0) {
      return [];
    }

    // For each process, find matching documents
    const reusableDocuments: Array<{
      _id: Id<"documentsDelivered">;
      fileName: string;
      fileSize: number;
      mimeType: string;
      fileUrl: string;
      status: string;
      version: number;
      uploadedAt: number;
      issueDate?: string;
      expiryDate?: string;
      personName?: string;
      processId: Id<"individualProcesses">;
    }> = [];

    for (const process of otherProcesses) {
      const docs = await ctx.db
        .query("documentsDelivered")
        .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", process._id))
        .collect();

      const matchingDocs = docs.filter(
        (doc) =>
          doc.documentTypeId === documentTypeId &&
          doc.isLatest &&
          (doc.storageId || doc.fileUrl) &&
          ["uploaded", "approved", "under_review"].includes(doc.status)
      );

      if (matchingDocs.length > 0) {
        const person = await cachedGet(process.personId);
        const personName = person ? getFullName(person) : undefined;

        for (const doc of matchingDocs) {
          // Resolve fileUrl from storageId if needed
          let resolvedFileUrl = doc.fileUrl;
          if (!resolvedFileUrl && doc.storageId) {
            resolvedFileUrl = await ctx.storage.getUrl(doc.storageId) ?? "";
          }
          reusableDocuments.push({
            _id: doc._id,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
            fileUrl: resolvedFileUrl ?? "",
            status: doc.status,
            version: doc.version,
            uploadedAt: doc.uploadedAt,
            issueDate: doc.issueDate,
            expiryDate: doc.expiryDate,
            personName,
            processId: process._id,
          });
        }
      }
    }

    // Sort by uploadedAt descending (newest first)
    reusableDocuments.sort((a, b) => b.uploadedAt - a.uploadedAt);

    return reusableDocuments;
  },
});

/**
 * Returns documentTypeIds that have at least one reusable document from other processes of the same company.
 * Used to conditionally show the reuse button in the UI.
 */
export const getReusableDocumentTypeIds = query({
  args: {
    companyApplicantId: v.id("companies"),
    excludeProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, { companyApplicantId, excludeProcessId }) => {
    await requireAdmin(ctx);

    const processes = await ctx.db
      .query("individualProcesses")
      .withIndex("by_companyApplicant", (q) => q.eq("companyApplicantId", companyApplicantId))
      .collect();

    const otherProcesses = processes.filter((p) => p._id !== excludeProcessId);
    if (otherProcesses.length === 0) return [];

    const reusableTypeIds = new Set<string>();

    for (const process of otherProcesses) {
      const docs = await ctx.db
        .query("documentsDelivered")
        .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", process._id))
        .collect();

      for (const doc of docs) {
        if (
          doc.documentTypeId &&
          doc.isLatest &&
          (doc.storageId || doc.fileUrl) &&
          ["uploaded", "approved", "under_review"].includes(doc.status)
        ) {
          reusableTypeIds.add(doc.documentTypeId);
        }
      }
    }

    return Array.from(reusableTypeIds);
  },
});

/**
 * Mutation to reuse a company document from another process
 * Copies file reference and metadata to the target document
 */
export const reuseCompanyDocument = mutation({
  args: {
    targetDocumentId: v.id("documentsDelivered"),
    sourceDocumentId: v.id("documentsDelivered"),
  },
  handler: async (ctx, { targetDocumentId, sourceDocumentId }) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get target document (the not_started one in current process)
    const targetDoc = await ctx.db.get(targetDocumentId);
    if (!targetDoc) {
      throw new Error("Target document not found");
    }
    if (targetDoc.status !== "not_started") {
      throw new Error("Target document already has a file uploaded");
    }

    // Get source document (the one to reuse)
    const sourceDoc = await ctx.db.get(sourceDocumentId);
    if (!sourceDoc) {
      throw new Error("Source document not found");
    }
    if (!sourceDoc.storageId && !sourceDoc.fileUrl) {
      throw new Error("Source document has no file");
    }

    // Validate both belong to the same company
    const targetProcess = await ctx.db.get(targetDoc.individualProcessId);
    const sourceProcess = await ctx.db.get(sourceDoc.individualProcessId);
    if (!targetProcess || !sourceProcess) {
      throw new Error("Process not found");
    }
    if (
      !targetProcess.companyApplicantId ||
      !sourceProcess.companyApplicantId ||
      targetProcess.companyApplicantId !== sourceProcess.companyApplicantId
    ) {
      throw new Error("Documents must belong to processes of the same company");
    }

    const previousStatus = targetDoc.status;
    // Bump version 0 (placeholder) → 1 on first fill via reuse
    const newVersion = targetDoc.version === 0 ? 1 : targetDoc.version;
    const uploadedAt = Date.now();
    const processStatusAtUpload = await getProcessStatusAtUpload(ctx, targetProcess);

    // Copy file data from source to target
    await ctx.db.patch(targetDocumentId, {
      storageId: sourceDoc.storageId,
      fileName: sourceDoc.fileName,
      fileSize: sourceDoc.fileSize,
      mimeType: sourceDoc.mimeType,
      fileUrl: sourceDoc.fileUrl,
      issueDate: sourceDoc.issueDate,
      expiryDate: sourceDoc.expiryDate,
      status: "approved",
      reusedFromDocumentId: sourceDocumentId,
      uploadedBy: userProfile.userId!,
      uploadedAt,
      createdAt: getDocumentCreatedAt(targetDoc),
      receivedAt: uploadedAt,
      reviewedBy: userProfile.userId!,
      reviewedAt: uploadedAt,
      version: newVersion,
      processStatusAtUpload: targetDoc.processStatusAtUpload ?? processStatusAtUpload,
    });

    // Auto-create conditions for the document
    if (targetDoc.documentTypeId) {
      await ctx.runMutation(internal.documentDeliveredConditions.autoCreateForDocument, {
        documentsDeliveredId: targetDocumentId,
        documentTypeId: targetDoc.documentTypeId,
        individualProcessId: targetDoc.individualProcessId,
      });
    }

    // Record status history
    await ctx.db.insert("documentStatusHistory", {
      documentId: targetDocumentId,
      previousStatus,
      newStatus: "approved",
      changedBy: userProfile.userId!,
      changedAt: Date.now(),
      notes: `Reused from document in another process`,
      metadata: {
        sourceDocumentId,
        sourceProcessId: sourceDoc.individualProcessId,
        fileName: sourceDoc.fileName,
      },
    });

    // Log activity
    try {
      if (userProfile.userId) {
        const documentType = targetDoc.documentTypeId
          ? await ctx.db.get(targetDoc.documentTypeId)
          : null;
        const person = await ctx.db.get(targetProcess.personId);

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: "reused",
          entityType: "document",
          entityId: targetDocumentId,
          details: {
            fileName: sourceDoc.fileName,
            documentType: documentType?.name,
            personName: person ? getFullName(person) : undefined,
            sourceDocumentId,
            sourceProcessId: sourceDoc.individualProcessId,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return targetDocumentId;
  },
});

/**
 * Bulk-reuse all available company documents for a process.
 * For each pending company document, finds the latest matching source from other processes of the same company.
 */
export const bulkReuseCompanyDocuments = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, { individualProcessId }) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const process = await ctx.db.get(individualProcessId);
    if (!process?.companyApplicantId) {
      throw new Error("Process has no company applicant");
    }

    // Get pending documents for this process
    const allDocs = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", individualProcessId))
      .collect();

    const pendingDocs = allDocs.filter(
      (doc) => doc.status === "not_started" && doc.documentTypeId && doc.isLatest,
    );

    // Filter to company documents only
    const companyPendingDocs = [];
    const docTypeCache = new Map<string, { isCompanyDocument?: boolean }>();
    for (const doc of pendingDocs) {
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

    const processStatusAtUpload = await getProcessStatusAtUpload(ctx, process);

    // Get latest source doc per type from other processes
    const otherProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_companyApplicant", (q) => q.eq("companyApplicantId", process.companyApplicantId!))
      .collect();

    const sourceByType = new Map<string, (typeof allDocs)[number]>();
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

    let reusedCount = 0;
    for (const targetDoc of companyPendingDocs) {
      const sourceDoc = sourceByType.get(targetDoc.documentTypeId!);
      if (!sourceDoc) continue;

      // Bump version 0 (placeholder) → 1 on first fill via reuse
      const newVersion = targetDoc.version === 0 ? 1 : targetDoc.version;
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
        uploadedBy: userProfile.userId!,
        uploadedAt,
        createdAt: getDocumentCreatedAt(targetDoc),
        receivedAt: uploadedAt,
        reviewedBy: userProfile.userId!,
        reviewedAt: uploadedAt,
        version: newVersion,
        processStatusAtUpload: targetDoc.processStatusAtUpload ?? processStatusAtUpload,
      });

      await ctx.db.insert("documentStatusHistory", {
        documentId: targetDoc._id,
        previousStatus: "not_started",
        newStatus: "approved",
        changedBy: userProfile.userId!,
        changedAt: Date.now(),
        notes: "Bulk reused from company document in another process",
        metadata: {
          sourceDocumentId: sourceDoc._id,
          sourceProcessId: sourceDoc.individualProcessId,
          fileName: sourceDoc.fileName,
        },
      });

      if (targetDoc.documentTypeId) {
        await ctx.runMutation(internal.documentDeliveredConditions.autoCreateForDocument, {
          documentsDeliveredId: targetDoc._id,
          documentTypeId: targetDoc.documentTypeId,
          individualProcessId,
        });
      }

      reusedCount++;
    }

    // Log activity
    try {
      if (userProfile.userId) {
        const person = await ctx.db.get(process.personId);
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: "reused",
          entityType: "document",
          entityId: individualProcessId,
          details: {
            personName: person ? getFullName(person) : undefined,
            bulkReuse: true,
            reusedCount,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return reusedCount;
  },
});

/**
 * Query to detect how many documents are missing from the checklist
 * Compares documentTypesLegalFrameworks associations against existing documentsDelivered
 */
/**
 * Mutation to add a single missing document for a specific legal framework association.
 * Used from the Requirements Checklist to selectively add individual missing documents.
 */
export const addMissingDocument = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    documentTypeLegalFrameworkId: v.id("documentTypesLegalFrameworks"),
  },
  handler: async (ctx, { individualProcessId, documentTypeLegalFrameworkId }) => {
    const adminProfile = await requireAdmin(ctx);
    if (!adminProfile.userId) {
      throw new Error("Admin user ID not found");
    }

    const individualProcess = await ctx.db.get(individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const assoc = await ctx.db.get(documentTypeLegalFrameworkId);
    if (!assoc) {
      throw new Error("Document type association not found");
    }

    const documentType = await ctx.db.get(assoc.documentTypeId);
    if (!documentType || !documentType.isActive) {
      throw new Error("Document type is inactive or not found");
    }

    // Check if already exists
    const existingDocs = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", individualProcessId),
      )
      .collect();

    const alreadyExists = existingDocs.some(
      (doc) =>
        doc.isLatest &&
        (doc.documentTypeLegalFrameworkId === assoc._id ||
         doc.documentTypeId === assoc.documentTypeId),
    );

    if (alreadyExists) {
      throw new Error("Document already exists in the list");
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    const createdAt = Date.now();
    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId,
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
      uploadedBy: adminProfile.userId,
      uploadedAt: createdAt,
      createdAt,
      version: 1,
      isLatest: true,
      excludedFromReport: documentType.excludeFromReportByDefault || undefined,
    });

    // Log activity
    try {
      const person = await ctx.db.get(individualProcess.personId);
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: adminProfile.userId,
        action: "created",
        entityType: "document",
        entityId: individualProcessId,
        details: {
          documentTypeName: documentType.name,
          personName: person ? getFullName(person) : undefined,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return documentId;
  },
});

/**
 * Mutation to sync missing documents from legal framework associations
 * Creates documentsDelivered records for associations that don't have a corresponding document
 */
export const syncMissingDocuments = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, { individualProcessId }) => {
    const adminProfile = await requireAdmin(ctx);
    if (!adminProfile.userId) {
      throw new Error("Admin user ID not found");
    }

    const individualProcess = await ctx.db.get(individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }
    if (!individualProcess.legalFrameworkId) {
      return { syncedCount: 0 };
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    // Get all associations for this legal framework
    const associations = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) =>
        q.eq("legalFrameworkId", individualProcess.legalFrameworkId!),
      )
      .collect();

    // Get all existing documents for this process (latest only)
    const existingDocs = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", individualProcessId),
      )
      .collect();

    const latestDocs = existingDocs.filter((doc) => doc.isLatest);

    let syncedCount = 0;
    for (const assoc of associations) {
      const documentType = await ctx.db.get(assoc.documentTypeId);
      if (!documentType || !documentType.isActive) continue;

      const exists = latestDocs.some(
        (doc) =>
          doc.documentTypeLegalFrameworkId === assoc._id ||
          doc.documentTypeId === assoc.documentTypeId,
      );
      if (exists) continue;

      const createdAt = Date.now();
      await ctx.db.insert("documentsDelivered", {
        individualProcessId,
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
        uploadedBy: adminProfile.userId,
        uploadedAt: createdAt,
        createdAt,
        version: 1,
        isLatest: true,
        excludedFromReport: documentType.excludeFromReportByDefault || undefined,
      });
      syncedCount++;
    }

    // Log activity
    try {
      if (adminProfile.userId) {
        const person = await ctx.db.get(individualProcess.personId);
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: adminProfile.userId,
          action: "created",
          entityType: "document",
          entityId: individualProcessId,
          details: {
            syncedCount,
            personName: person ? getFullName(person) : undefined,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return { syncedCount };
  },
});

/**
 * One-time cleanup mutation: Remove duplicate documents from individual processes.
 * A duplicate = same individualProcessId + same documentTypeId with more than one record.
 * Only deletes duplicates that have NO attachment (storageId is undefined and fileUrl is empty).
 * Keeps the first record (oldest by _creationTime) and deletes the rest.
 */
export const cleanupDuplicateDocuments = internalMutation({
  args: {},
  handler: async (ctx) => {

    // Get all individual processes
    const allProcesses = await ctx.db.query("individualProcesses").collect();

    let totalDeleted = 0;
    let totalSkipped = 0;
    const processesAffected: string[] = [];

    for (const process of allProcesses) {
      // Get all documents for this process
      const docs = await ctx.db
        .query("documentsDelivered")
        .withIndex("by_individualProcess", (q) =>
          q.eq("individualProcessId", process._id),
        )
        .collect();

      // Group by documentTypeId
      const byType = new Map<string, typeof docs>();
      for (const doc of docs) {
        if (!doc.documentTypeId) continue;
        const key = doc.documentTypeId;
        if (!byType.has(key)) {
          byType.set(key, []);
        }
        byType.get(key)!.push(doc);
      }

      let deletedInProcess = 0;

      for (const [_typeId, typeDocs] of byType) {
        if (typeDocs.length <= 1) continue;

        // Sort by creation time - keep the oldest
        typeDocs.sort((a, b) => a._creationTime - b._creationTime);

        // The first one is the "keeper"
        const duplicates = typeDocs.slice(1);

        for (const dup of duplicates) {
          // Only delete if there's no attachment
          const hasAttachment = dup.storageId || (dup.fileUrl && dup.fileUrl !== "");
          if (hasAttachment) {
            totalSkipped++;
            continue;
          }

          await ctx.db.delete(dup._id);
          totalDeleted++;
          deletedInProcess++;
        }
      }

      if (deletedInProcess > 0) {
        processesAffected.push(process._id);
      }
    }

    return {
      totalDeleted,
      totalSkipped,
      processesAffectedCount: processesAffected.length,
      processesAffected,
    };
  },
});

/**
 * Mutation to submit information-only document fields.
 * Updates entity fields and auto-approves the document record.
 */
export const submitInformationFields = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    documentTypeId: v.id("documentTypes"),
    documentRequirementId: v.optional(v.id("documentRequirements")),
    documentTypeLegalFrameworkId: v.optional(v.id("documentTypesLegalFrameworks")),
    changes: v.array(
      v.object({
        entityType: v.string(),
        fieldPath: v.string(),
        value: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    const process = await ctx.db.get(args.individualProcessId);
    if (!process) throw new Error("Individual process not found");

    // Apply field value changes (same logic as updateFieldValues)
    const grouped: Record<string, Record<string, any>> = {};
    for (const change of args.changes) {
      if (!grouped[change.entityType]) grouped[change.entityType] = {};
      grouped[change.entityType][change.fieldPath] = change.value;
    }

    if (grouped.person) {
      await ctx.db.patch(process.personId, grouped.person);
    }

    if (grouped.individualProcess) {
      await ctx.db.patch(args.individualProcessId, grouped.individualProcess);
    }

    if (grouped.passport && process.passportId) {
      await ctx.db.patch(process.passportId, grouped.passport);
    }

    if (grouped.company) {
      let companyId = process.companyApplicantId;
      if (!companyId && process.collectiveProcessId) {
        const collective = await ctx.db.get(process.collectiveProcessId);
        companyId = collective?.companyId ?? undefined;
      }
      if (companyId) {
        await ctx.db.patch(companyId, grouped.company);
      }
    }

    // Find the existing document record (not_started or already approved for re-edit)
    const existingDocs = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", args.individualProcessId)
      )
      .collect();

    const existingDoc = existingDocs.find(
      (doc) =>
        doc.documentTypeId === args.documentTypeId &&
        doc.documentRequirementId === args.documentRequirementId &&
        doc.isLatest
    );

    const now = Date.now();
    const processStatusAtUpload = await getProcessStatusAtUpload(ctx, process);

    if (existingDoc) {
      // Bump version 0 (placeholder) → 1 on first fill; preserve existing for re-edit
      const newVersion = existingDoc.version > 0 ? existingDoc.version : 1;
      const createdAt = getDocumentCreatedAt(existingDoc);
      const receivedAt = getDocumentReceivedAt(existingDoc) ?? now;
      // Update the existing record - auto-approve
      await ctx.db.patch(existingDoc._id, {
        status: "approved",
        fileName: "information_only",
        fileSize: 0,
        mimeType: "application/x-info-only",
        fileUrl: "",
        uploadedBy: existingDoc.uploadedBy ?? userProfile.userId,
        uploadedAt: receivedAt,
        createdAt,
        receivedAt,
        reviewedBy: userProfile.userId,
        reviewedAt: now,
        version: newVersion,
        isLatest: true,
        ...(existingDoc.version === 0 ? { processStatusAtUpload } : {}),
      });

      return existingDoc._id;
    }

    // No existing record - should not normally happen since syncMissingDocuments creates them,
    // but handle gracefully by creating one.
    const collectiveProcess = process.collectiveProcessId
      ? await ctx.db.get(process.collectiveProcessId)
      : null;

    // Fetch document type for excludeFromReportByDefault
    const documentType = args.documentTypeId ? await ctx.db.get(args.documentTypeId) : null;

    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: args.individualProcessId,
      documentTypeId: args.documentTypeId,
      documentRequirementId: args.documentRequirementId,
      documentTypeLegalFrameworkId: args.documentTypeLegalFrameworkId,
      personId: process.personId,
      companyId: collectiveProcess?.companyId,
      fileName: "information_only",
      fileUrl: "",
      fileSize: 0,
      mimeType: "application/x-info-only",
      status: "approved",
      uploadedBy: userProfile.userId,
      uploadedAt: now,
      createdAt: now,
      receivedAt: now,
      reviewedBy: userProfile.userId,
      reviewedAt: now,
      version: 1,
      isLatest: true,
      processStatusAtUpload,
      excludedFromReport: documentType?.excludeFromReportByDefault || undefined,
    });

    return documentId;
  },
});

/**
 * Query to list documents available for linking to a status entry.
 * Returns latest docs from the process, excluding those already linked to the given status.
 */
export const listAvailableForLinking = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
    excludeStatusId: v.optional(v.id("individualProcessStatuses")),
  },
  handler: async (ctx, { individualProcessId, excludeStatusId }) => {
    const individualProcess = await ctx.db.get(individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const userProfile = await getCurrentUserProfile(ctx);
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Get all latest documents for this process
    const documents = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", individualProcessId)
      )
      .collect();

    // Filter: latest only, exclude docs already linked to the same exigência
    const available = documents.filter((doc) => {
      if (!doc.isLatest) return false;
      if (!canAccessDocument(doc, visibility)) return false;
      if (excludeStatusId && doc.individualProcessStatusId === excludeStatusId) return false;
      return true;
    });

    // Enrich with document type and conditions
    const enriched = await Promise.all(
      available.map(async (doc) => {
        const documentType = doc.documentTypeId
          ? await cachedGet(doc.documentTypeId)
          : null;

        // Get linked status info if any
        let linkedStatus = undefined;
        if (doc.individualProcessStatusId) {
          const statusEntry = await cachedGet(doc.individualProcessStatusId);
          if (statusEntry) {
            const caseStatus = await cachedGet(statusEntry.caseStatusId);
            if (caseStatus) {
              linkedStatus = {
                caseStatusName: caseStatus.name,
                caseStatusCode: caseStatus.code,
                caseStatusColor: caseStatus.color,
                date: statusEntry.date,
                clientDeadlineDate: statusEntry.clientDeadlineDate,
                individualProcessStatusId: doc.individualProcessStatusId!,
              };
            }
          }
        }

        // Compute conditions summary
        let conditionsSummary = undefined;
        if (doc.status !== "not_started") {
          const docConditions = await ctx.db
            .query("documentDeliveredConditions")
            .withIndex("by_documentDelivered", (q) =>
              q.eq("documentsDeliveredId", doc._id)
            )
            .collect();

          if (docConditions.length > 0) {
            const conditions = await Promise.all(
              docConditions.map(async (dc) => {
                const condition = await cachedGet(dc.documentTypeConditionId);
                return {
                  name: condition?.name ?? "",
                  isFulfilled: dc.isFulfilled,
                };
              })
            );
            conditionsSummary = {
              total: conditions.length,
              fulfilled: conditions.filter((c) => c.isFulfilled).length,
              conditions,
            };
          }
        } else if (doc.documentTypeId) {
          // For not_started documents, derive conditions from the document type definition
          const conditionLinks = await ctx.db
            .query("documentTypeConditionLinks")
            .withIndex("by_documentType", (q) =>
              q.eq("documentTypeId", doc.documentTypeId!)
            )
            .collect();

          if (conditionLinks.length > 0) {
            const conditions: Array<{ name: string; isFulfilled: boolean }> = [];
            for (const link of conditionLinks) {
              const condition = await cachedGet(link.documentTypeConditionId);
              if (condition && condition.isActive) {
                conditions.push({ name: condition.name, isFulfilled: false });
              }
            }
            if (conditions.length > 0) {
              conditionsSummary = {
                total: conditions.length,
                fulfilled: 0,
                conditions,
              };
            }
          }
        }

        // Override conditions summary when bypass is active
        if (doc.bypassConditions && conditionsSummary) {
          conditionsSummary = {
            ...conditionsSummary,
            fulfilled: conditionsSummary.total,
            conditions: conditionsSummary.conditions.map((c: { name: string; isFulfilled: boolean }) => ({ ...c, isFulfilled: true })),
            bypassed: true,
          };
        }

        return {
          _id: doc._id,
          fileName: doc.fileName,
          documentName: doc.documentName,
          status: doc.status,
          documentTypeId: doc.documentTypeId,
          documentType: documentType
            ? { name: documentType.name, isCompanyDocument: documentType.isCompanyDocument }
            : null,
          individualProcessStatusId: doc.individualProcessStatusId,
          linkedStatus,
          conditionsSummary,
          bypassConditions: doc.bypassConditions,
        };
      })
    );

    return enriched;
  },
});

/**
 * Mutation to link an existing document to a status entry.
 * Updates the document's individualProcessStatusId.
 */
export const linkToStatus = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
    individualProcessStatusId: v.id("individualProcessStatuses"),
  },
  handler: async (ctx, { documentId, individualProcessStatusId }) => {
    const adminProfile = await requireAdmin(ctx);

    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    const statusEntry = await ctx.db.get(individualProcessStatusId);
    if (!statusEntry) {
      throw new Error("Status entry not found");
    }

    // Ensure both belong to the same individual process
    if (document.individualProcessId !== statusEntry.individualProcessId) {
      throw new Error("Document and status entry belong to different processes");
    }

    await ctx.db.patch(documentId, { individualProcessStatusId });

    return documentId;
  },
});

/**
 * Link an empty pending document to the latest requirement status.
 * Keeps the same version pending so the admin can upload it immediately.
 */
export const linkPendingToLatestExigencia = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
    individualProcessStatusId: v.id("individualProcessStatuses"),
  },
  returns: v.id("documentsDelivered"),
  handler: async (ctx, { documentId, individualProcessStatusId }) => {
    await requireAdmin(ctx);

    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new ConvexError({
        code: "DOCUMENT_NOT_FOUND",
        message: "Document not found",
      });
    }

    if (
      document.status !== "not_started" ||
      document.isLatest !== true ||
      document.storageId !== undefined ||
      document.fileUrl.trim() !== ""
    ) {
      throw new ConvexError({
        code: "DOCUMENT_NOT_PENDING",
        message: "Only the latest pending document without an attachment can be linked",
      });
    }

    const statusEntry = await ctx.db.get(individualProcessStatusId);
    if (!statusEntry) {
      throw new ConvexError({
        code: "STATUS_NOT_FOUND",
        message: "Status entry not found",
      });
    }

    if (document.individualProcessId !== statusEntry.individualProcessId) {
      throw new ConvexError({
        code: "PROCESS_MISMATCH",
        message: "Document and status entry belong to different processes",
      });
    }

    const caseStatus = await ctx.db.get(statusEntry.caseStatusId);
    if (caseStatus?.code !== "exigencia") {
      throw new ConvexError({
        code: "STATUS_NOT_EXIGENCIA",
        message: "The target status is not a requirement",
      });
    }

    const statusHistory = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", document.individualProcessId)
      )
      .collect();

    const latestStatus = statusHistory.sort((a, b) => {
      const dateA = a.date || new Date(a.changedAt).toISOString().split("T")[0];
      const dateB = b.date || new Date(b.changedAt).toISOString().split("T")[0];
      return dateB.localeCompare(dateA);
    })[0];

    if (latestStatus?._id !== individualProcessStatusId) {
      throw new ConvexError({
        code: "STATUS_NOT_LATEST",
        message: "The requirement is no longer the latest status",
      });
    }

    if (document.individualProcessStatusId === individualProcessStatusId) {
      return documentId;
    }

    await ctx.db.patch(documentId, {
      individualProcessStatusId,
    });

    return documentId;
  },
});

/**
 * Mutation to link an existing document to a status entry AND reject it.
 * Used for "exigência" flows where selecting an existing document implies rejection.
 */
export const linkToStatusAndReject = mutation({
  args: {
    documentId: v.id("documentsDelivered"),
    individualProcessStatusId: v.id("individualProcessStatuses"),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, individualProcessStatusId, rejectionReason }) => {
    const adminProfile = await requireAdmin(ctx);

    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    const statusEntry = await ctx.db.get(individualProcessStatusId);
    if (!statusEntry) {
      throw new Error("Status entry not found");
    }

    // Ensure both belong to the same individual process
    if (document.individualProcessId !== statusEntry.individualProcessId) {
      throw new Error("Document and status entry belong to different processes");
    }

    const previousStatus = document.status;

    // Link to status + reject + mark as not latest
    await ctx.db.patch(documentId, {
      individualProcessStatusId,
      status: "rejected",
      reviewedBy: adminProfile.userId,
      reviewedAt: Date.now(),
      rejectionReason: rejectionReason?.trim() || undefined,
      isLatest: false,
    });

    // Record status history
    await ctx.db.insert("documentStatusHistory", {
      documentId,
      previousStatus,
      newStatus: "rejected",
      changedBy: adminProfile.userId!,
      changedAt: Date.now(),
      notes: rejectionReason,
      metadata: {
        fileName: document.fileName,
        version: document.version,
      },
    });

    // Auto-create new version (not_started) awaiting re-upload
    const createdAt = Date.now();
    const newDocId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: document.individualProcessId,
      documentTypeId: document.documentTypeId,
      documentRequirementId: document.documentRequirementId,
      documentTypeLegalFrameworkId: document.documentTypeLegalFrameworkId,
      isRequired: document.isRequired,
      personId: document.personId,
      companyId: document.companyId,
      individualProcessStatusId,
      fileName: "",
      fileUrl: "",
      fileSize: 0,
      mimeType: "",
      status: "not_started",
      uploadedBy: adminProfile.userId!,
      uploadedAt: createdAt,
      createdAt,
      version: document.version + 1,
      isLatest: true,
      excludedFromReport: document.excludedFromReport,
      bypassConditions: document.bypassConditions,
    });

    // Auto-create conditions for the new version
    if (document.documentTypeId) {
      try {
        await ctx.scheduler.runAfter(
          0,
          internal.documentDeliveredConditions.autoCreateForDocument,
          {
            documentsDeliveredId: newDocId,
            documentTypeId: document.documentTypeId,
            individualProcessId: document.individualProcessId,
            previousDocumentsDeliveredId: documentId,
          }
        );
      } catch (error) {
        console.error("Failed to auto-create conditions after rejection:", error);
      }
    }

    // Send notification to document uploader
    try {
      const documentType = document.documentTypeId
        ? await ctx.db.get(document.documentTypeId)
        : null;
      const documentTypeName = documentType?.name || "Document";

      await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
        userId: document.uploadedBy,
        type: "document_rejected",
        title: "Document Rejected",
        message: `Your document "${documentTypeName}" was rejected: ${rejectionReason}`,
        entityType: "document",
        entityId: documentId,
      });
    } catch (error) {
      console.error("Failed to create document rejection notification:", error);
    }

    // Log activity
    try {
      if (adminProfile.userId) {
        const [individualProcess, documentType, person] = await Promise.all([
          ctx.db.get(document.individualProcessId),
          document.documentTypeId ? ctx.db.get(document.documentTypeId) : null,
          document.personId ? ctx.db.get(document.personId) : null,
        ]);

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: adminProfile.userId,
          action: "rejected",
          entityType: "document",
          entityId: documentId,
          details: {
            fileName: document.fileName,
            documentType: documentType?.name,
            personName: person ? getFullName(person) : undefined,
            rejectionReason,
            previousStatus,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return documentId;
  },
});

/**
 * Query to get unified document history (versions + status changes) for timeline display.
 * Combines version creation events with status change events, sorted chronologically.
 */
export const getUnifiedDocumentHistory = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
    documentTypeId: v.optional(v.id("documentTypes")),
    documentRequirementId: v.optional(v.id("documentRequirements")),
    documentId: v.optional(v.id("documentsDelivered")),
  },
  handler: async (ctx, { individualProcessId, documentTypeId, documentRequirementId, documentId }) => {
    // Access control
    const individualProcess = await ctx.db.get(individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const userProfile = await requireAdmin(ctx);
    await requireClientCanAccessProcess(ctx, userProfile, individualProcess);
    const visibility = await resolveClientDocumentVisibility(
      ctx,
      userProfile,
      individualProcess,
    );

    // Get all matching documents
    let documents;
    if (documentTypeId) {
      // Typed document: match by type + requirement
      const allDocs = await ctx.db
        .query("documentsDelivered")
        .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", individualProcessId))
        .collect();
      documents = allDocs.filter(
        (doc) =>
          doc.documentTypeId === documentTypeId &&
          doc.documentRequirementId === documentRequirementId &&
          canAccessDocument(doc, visibility)
      );
    } else if (documentId) {
      // Loose document: just get by ID
      const doc = await ctx.db.get(documentId);
      documents = doc && canAccessDocument(doc, visibility) ? [doc] : [];
    } else {
      return [];
    }

    // Collect user IDs for batch enrichment
    const userIdSet = new Set<string>();
    documents.forEach((doc) => {
      userIdSet.add(doc.uploadedBy);
      if (doc.reviewedBy) userIdSet.add(doc.reviewedBy);
    });

    // Get all status history for all document versions
    const allStatusHistory = await Promise.all(
      documents.map((doc) =>
        ctx.db
          .query("documentStatusHistory")
          .withIndex("by_document", (q) => q.eq("documentId", doc._id))
          .collect()
      )
    );
    const flatStatusHistory = allStatusHistory.flat();
    flatStatusHistory.forEach((entry) => {
      userIdSet.add(entry.changedBy);
    });

    // Batch resolve user profiles
    const userIds = Array.from(userIdSet);
    const userProfileMap = new Map<string, { fullName: string; email?: string }>();
    await Promise.all(
      userIds.map(async (userId) => {
        const user = await ctx.db.get(userId as Id<"users">);
        if (user) {
          const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .first();
          userProfileMap.set(userId, {
            fullName: profile?.fullName || user.email || "Unknown",
            email: user.email,
          });
        }
      })
    );

    // Build timeline entries
    type TimelineEntry =
      | {
          type: "version_created";
          timestamp: number;
          version: number;
          fileName: string;
          fileSize: number;
          status: string;
          isLatest: boolean;
          userName: string;
          documentId: string;
          versionNotes?: string;
        }
      | {
          type: "status_change";
          timestamp: number;
          previousStatus?: string;
          newStatus: string;
          userName: string;
          notes?: string;
          version?: number;
          documentId: string;
        };

    const timeline: TimelineEntry[] = [];

    // Add version_created entries
    for (const doc of documents) {
      const userInfo = userProfileMap.get(doc.uploadedBy);
      timeline.push({
        type: "version_created",
        timestamp: doc.uploadedAt,
        version: doc.version,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        status: doc.status,
        isLatest: doc.isLatest ?? false,
        userName: userInfo?.fullName || "Unknown",
        documentId: doc._id,
        versionNotes: doc.versionNotes,
      });
    }

    // Add status_change entries
    for (const entry of flatStatusHistory) {
      const userInfo = userProfileMap.get(entry.changedBy);
      const metadata = entry.metadata as { version?: number } | undefined;
      timeline.push({
        type: "status_change",
        timestamp: entry.changedAt,
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        userName: userInfo?.fullName || "Unknown",
        notes: entry.notes,
        version: metadata?.version,
        documentId: entry.documentId,
      });
    }

    // Sort ascending by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);

    return timeline;
  },
});
