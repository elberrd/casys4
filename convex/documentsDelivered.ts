import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin, getCurrentUserProfile, canAccessCompany } from "./lib/auth";
import { internal } from "./_generated/api";
import { checkDocumentValidity } from "./lib/documentValidity";

function getFullName(person: { givenNames?: string; fullName?: string; middleName?: string; surname?: string }): string {
  return [person.givenNames || person.fullName || "", person.middleName, person.surname].filter(Boolean).join(" ");
}

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

    // Get main process to get company ID (if exists)
    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    // Check access control
    const userProfile = await getCurrentUserProfile(ctx);
    if (collectiveProcess?.companyId) {
      const hasAccess = await canAccessCompany(ctx, collectiveProcess.companyId);
      if (!hasAccess) {
        throw new Error("Access denied: You do not have permission to view these documents");
      }
    }

    // Query documents by individual process
    let documentsQuery = ctx.db
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

    // Enrich with related data
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const documentType = doc.documentTypeId
          ? await ctx.db.get(doc.documentTypeId)
          : null;
        const documentRequirement = doc.documentRequirementId
          ? await ctx.db.get(doc.documentRequirementId)
          : null;
        const uploadedByUser = await ctx.db.get(doc.uploadedBy);
        const reviewedByUser = doc.reviewedBy
          ? await ctx.db.get(doc.reviewedBy)
          : null;

        return {
          ...doc,
          documentType,
          documentRequirement,
          uploadedByUser,
          reviewedByUser,
        };
      }),
    );

    return enrichedDocuments;
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

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    if (collectiveProcess?.companyId) {
      const hasAccess = await canAccessCompany(ctx, collectiveProcess.companyId);
      if (!hasAccess) {
        throw new Error("Access denied: You do not have permission to view this document");
      }
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

    return {
      ...document,
      documentType,
      documentRequirement,
      uploadedByUser,
      reviewedByUser,
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
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get individual process to check access and get related data
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    // Check access control
    if (collectiveProcess?.companyId) {
      const hasAccess = await canAccessCompany(ctx, collectiveProcess.companyId);
      if (!hasAccess) {
        throw new Error("Access denied: You do not have permission to upload documents for this process");
      }
    }

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
    let existingDocuments = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", args.individualProcessId))
      .collect();

    existingDocuments = existingDocuments.filter(
      (doc) =>
        doc.documentTypeId === args.documentTypeId &&
        doc.documentRequirementId === args.documentRequirementId &&
        doc.isLatest
    );

    let version = 1;

    // If replacing, mark old version as not latest
    if (existingDocuments.length > 0) {
      const existingDoc = existingDocuments[0];
      version = existingDoc.version + 1;

      await ctx.db.patch(existingDoc._id, {
        isLatest: false,
      });
    }

    // Create new document record
    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: args.individualProcessId,
      documentTypeId: args.documentTypeId,
      documentRequirementId: args.documentRequirementId,
      personId: individualProcess.personId,
      companyId: collectiveProcess?.companyId,
      fileName: args.fileName,
      fileUrl: fileUrl,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      status: "uploaded",
      uploadedBy: uploaderUserId,
      uploadedAt: Date.now(),
      expiryDate: args.expiryDate,
      issueDate: args.issueDate,
      version: version,
      isLatest: true,
      versionNotes: args.versionNotes,
    });

    // Auto-create conditions for this document based on document type
    // Only for new documents (version 1), not replacements
    if (version === 1) {
      try {
        await ctx.scheduler.runAfter(
          0,
          internal.documentDeliveredConditions.autoCreateForDocument,
          {
            documentsDeliveredId: documentId,
            documentTypeId: args.documentTypeId,
            individualProcessId: args.individualProcessId,
          }
        );
      } catch (error) {
        console.error("Failed to auto-create conditions:", error);
      }
    }

    // Log activity (non-blocking)
    try {
      const [person, documentType] = await Promise.all([
        ctx.db.get(individualProcess.personId),
        ctx.db.get(args.documentTypeId),
      ]);

      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: uploaderUserId,
        action: "uploaded",
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
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
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

    if (conditions.length > 0) {
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
  },
  handler: async (ctx, { id, rejectionReason }) => {
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

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    if (collectiveProcess?.companyId) {
      const hasAccess = await canAccessCompany(ctx, collectiveProcess.companyId);
      if (!hasAccess) {
        throw new Error("Access denied: You do not have permission to view this document history");
      }
    }

    // Get all versions
    let documents = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", individualProcessId))
      .collect();

    // Filter by documentType and requirement
    documents = documents.filter(
      (doc) =>
        doc.documentTypeId === documentTypeId &&
        doc.documentRequirementId === documentRequirementId
    );

    // Enrich with related data including user profile names
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const uploadedByUser = await ctx.db.get(doc.uploadedBy);
        let uploadedByProfile = null;
        if (uploadedByUser) {
          uploadedByProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", uploadedByUser._id))
            .first();
        }
        const reviewedByUser = doc.reviewedBy
          ? await ctx.db.get(doc.reviewedBy)
          : null;
        let reviewedByProfile = null;
        if (reviewedByUser) {
          reviewedByProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", reviewedByUser._id))
            .first();
        }

        return {
          ...doc,
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
      uploadedAt: Date.now(),
      expiryDate: oldDocument.expiryDate,
      version: newVersion,
      isLatest: true,
      versionNotes: notes,
    });

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
      const individualProcess = await ctx.db.get(processId);
      if (!individualProcess) {
        continue;
      }

      const person = await ctx.db.get(individualProcess.personId);
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
          ? await ctx.db.get(doc.documentTypeId)
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
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    expiryDate: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    versionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get individual process to check access
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    // Check access control
    if (collectiveProcess?.companyId) {
      const hasAccess = await canAccessCompany(ctx, collectiveProcess.companyId);
      if (!hasAccess) {
        throw new Error("Access denied: You do not have permission to upload documents for this process");
      }
    }

    if (!userProfile.userId) {
      throw new Error("User profile must be activated before uploading documents");
    }
    const uploaderUserId = userProfile.userId;

    // Get file URL from storage
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) {
      throw new Error("Failed to get file URL from storage");
    }

    // Create document without type (loose document)
    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: args.individualProcessId,
      // documentTypeId is undefined - this is a loose document
      personId: individualProcess.personId,
      companyId: collectiveProcess?.companyId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileUrl: fileUrl,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      status: "uploaded",
      uploadedBy: uploaderUserId,
      uploadedAt: Date.now(),
      expiryDate: args.expiryDate,
      issueDate: args.issueDate,
      version: 1,
      isLatest: true,
      versionNotes: args.versionNotes,
    });

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
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    expiryDate: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    versionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get individual process
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    // Check access control
    if (collectiveProcess?.companyId) {
      const hasAccess = await canAccessCompany(ctx, collectiveProcess.companyId);
      if (!hasAccess) {
        throw new Error("Access denied: You do not have permission to upload documents for this process");
      }
    }

    if (!userProfile.userId) {
      throw new Error("User profile must be activated before uploading documents");
    }
    const uploaderUserId = userProfile.userId;

    // Get document type and validate constraints
    const documentType = await ctx.db.get(args.documentTypeId);
    if (!documentType) {
      throw new Error("Document type not found");
    }

    if (!documentType.isActive) {
      throw new Error("Document type is not active");
    }

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

    // Get file URL from storage
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) {
      throw new Error("Failed to get file URL from storage");
    }

    // Check for existing document of same type
    let existingDocuments = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", args.individualProcessId))
      .collect();

    existingDocuments = existingDocuments.filter(
      (doc) =>
        doc.documentTypeId === args.documentTypeId &&
        doc.isLatest
    );

    let version = 1;

    // If replacing, mark old version as not latest
    if (existingDocuments.length > 0) {
      const existingDoc = existingDocuments[0];
      version = existingDoc.version + 1;

      await ctx.db.patch(existingDoc._id, {
        isLatest: false,
      });
    }

    // Create document with type
    const documentId = await ctx.db.insert("documentsDelivered", {
      individualProcessId: args.individualProcessId,
      documentTypeId: args.documentTypeId,
      personId: individualProcess.personId,
      companyId: collectiveProcess?.companyId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileUrl: fileUrl,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      status: "uploaded",
      uploadedBy: uploaderUserId,
      uploadedAt: Date.now(),
      expiryDate: args.expiryDate,
      issueDate: args.issueDate,
      version: version,
      isLatest: true,
      isRequired: false, // Manual uploads with type are optional by default
      versionNotes: args.versionNotes,
    });

    // Auto-create conditions for this document based on document type
    // Only for new documents (version 1), not replacements
    if (version === 1) {
      try {
        await ctx.scheduler.runAfter(
          0,
          internal.documentDeliveredConditions.autoCreateForDocument,
          {
            documentsDeliveredId: documentId,
            documentTypeId: args.documentTypeId,
            individualProcessId: args.individualProcessId,
          }
        );
      } catch (error) {
        console.error("Failed to auto-create conditions:", error);
      }
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

    // Check access control
    if (collectiveProcess?.companyId) {
      const hasAccess = await canAccessCompany(ctx, collectiveProcess.companyId);
      if (!hasAccess) {
        throw new Error("Access denied: You do not have permission to modify this document");
      }
    }

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
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Must be a pending document (not_started status)
    if (document.status !== "not_started") {
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

    // Check access control
    if (collectiveProcess?.companyId) {
      const hasAccess = await canAccessCompany(ctx, collectiveProcess.companyId);
      if (!hasAccess) {
        throw new Error("Access denied: You do not have permission to upload documents for this process");
      }
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

    // Update the pending document with file information
    await ctx.db.patch(args.documentId, {
      storageId: args.storageId,
      fileName: args.fileName,
      fileUrl: fileUrl,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      status: "uploaded",
      uploadedBy: uploaderUserId,
      uploadedAt: Date.now(),
      expiryDate: args.expiryDate,
      issueDate: args.issueDate,
      versionNotes: args.versionNotes,
    });

    // Auto-create conditions for this document based on document type
    // Check if conditions already exist (from prior creation of pending document)
    if (document.documentTypeId) {
      const existingConditions = await ctx.db
        .query("documentDeliveredConditions")
        .withIndex("by_documentDelivered", (q) =>
          q.eq("documentsDeliveredId", args.documentId)
        )
        .first();

      // Only create conditions if none exist yet
      if (!existingConditions) {
        try {
          await ctx.scheduler.runAfter(
            0,
            internal.documentDeliveredConditions.autoCreateForDocument,
            {
              documentsDeliveredId: args.documentId,
              documentTypeId: document.documentTypeId,
              individualProcessId: document.individualProcessId,
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
        entityId: args.documentId,
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

    return args.documentId;
  },
});

/**
 * List documents grouped by category
 * Returns documents separated into: required, optional, and loose
 */
export const listGroupedByCategory = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, { individualProcessId }) => {
    // Get individual process to check access
    const individualProcess = await ctx.db.get(individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    // Check access control
    if (collectiveProcess?.companyId) {
      const hasAccess = await canAccessCompany(ctx, collectiveProcess.companyId);
      if (!hasAccess) {
        throw new Error("Access denied: You do not have permission to view these documents");
      }
    }

    // Get all latest documents for this process
    let documents = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", individualProcessId))
      .collect();

    documents = documents.filter((doc) => doc.isLatest);

    // Enrich with related data
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const documentType = doc.documentTypeId
          ? await ctx.db.get(doc.documentTypeId)
          : null;
        const documentRequirement = doc.documentRequirementId
          ? await ctx.db.get(doc.documentRequirementId)
          : null;
        const uploadedByUser = doc.uploadedBy
          ? await ctx.db.get(doc.uploadedBy)
          : null;
        const reviewedByUser = doc.reviewedBy
          ? await ctx.db.get(doc.reviewedBy)
          : null;

        // Compute validity check if association exists
        let validityCheck = undefined;
        let validityRule = undefined;
        if (doc.documentTypeLegalFrameworkId) {
          const association = await ctx.db.get(doc.documentTypeLegalFrameworkId);
          if (association && association.validityType && association.validityDays) {
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

        return {
          ...doc,
          documentType,
          documentRequirement,
          uploadedByUser,
          reviewedByUser,
          validityCheck,
          validityRule,
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

    const collectiveProcess = individualProcess.collectiveProcessId
      ? await ctx.db.get(individualProcess.collectiveProcessId)
      : null;

    // Check access control
    if (collectiveProcess?.companyId) {
      const hasAccess = await canAccessCompany(ctx, collectiveProcess.companyId);
      if (!hasAccess) {
        throw new Error("Access denied: You do not have permission to view this document history");
      }
    }

    // Get all status history entries
    const history = await ctx.db
      .query("documentStatusHistory")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .order("desc")
      .collect();

    // Enrich with user information
    const enrichedHistory = await Promise.all(
      history.map(async (entry) => {
        const changedByUser = await ctx.db.get(entry.changedBy);
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
