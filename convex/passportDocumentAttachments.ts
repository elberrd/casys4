import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { createCachedGet } from "./lib/cachedGet";
import { getProcessStatusAtUpload } from "./lib/documentProgressSnapshot";
import {
  getPassportDocumentFileMetadata,
  isPassportDocumentName,
  PASSPORT_DOCUMENT_ATTACHMENT_NOTE,
} from "./lib/passportDocumentSync";
import { logActivitySafely } from "./lib/activityLogger";
import { internal } from "./_generated/api";
import {
  getDocumentCreatedAt,
  getDocumentReceivedAt,
} from "./lib/documentReceiptTiming";

const attachmentCandidateValidator = v.object({
  documentId: v.id("documentsDelivered"),
  individualProcessId: v.id("individualProcesses"),
  processReference: v.union(v.string(), v.null()),
  legalFrameworkName: v.union(v.string(), v.null()),
  documentName: v.string(),
  status: v.string(),
  currentVersion: v.number(),
  currentFileName: v.union(v.string(), v.null()),
  hasFile: v.boolean(),
});

const attachmentModeValidator = v.union(
  v.literal("fill"),
  v.literal("replace"),
  v.literal("new_version"),
);

function isSameDocumentGroup(
  candidate: {
    documentTypeId?: string;
    documentRequirementId?: string;
    documentTypeLegalFrameworkId?: string;
    documentName?: string;
  },
  target: {
    documentTypeId?: string;
    documentRequirementId?: string;
    documentTypeLegalFrameworkId?: string;
    documentName?: string;
  },
): boolean {
  if (!candidate.documentTypeId && !target.documentTypeId) {
    return candidate.documentName === target.documentName;
  }

  return (
    candidate.documentTypeId === target.documentTypeId &&
    candidate.documentRequirementId === target.documentRequirementId &&
    candidate.documentTypeLegalFrameworkId ===
      target.documentTypeLegalFrameworkId
  );
}

/**
 * Lists the current process documents that may receive the file already stored
 * on a passport. This is intentionally admin-only because the result spans all
 * processes belonging to the passport holder.
 */
export const listCandidates = query({
  args: {
    passportId: v.id("passports"),
    individualProcessId: v.optional(v.id("individualProcesses")),
  },
  returns: v.array(attachmentCandidateValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const passport = await ctx.db.get(args.passportId);
    const personId = passport?.personId;
    if (!personId) return [];

    const scopedProcess = args.individualProcessId
      ? await ctx.db.get(args.individualProcessId)
      : null;
    if (
      args.individualProcessId &&
      (!scopedProcess ||
        scopedProcess.personId !== personId ||
        scopedProcess.passportId !== passport._id)
    ) {
      return [];
    }

    const processes = scopedProcess
      ? [scopedProcess]
      : await ctx.db
          .query("individualProcesses")
          .withIndex("by_person", (q) => q.eq("personId", personId))
          .collect();
    const cachedGet = createCachedGet(ctx.db);

    const candidatesByProcess = await Promise.all(
      processes.map(async (individualProcess) => {
        const [documents, collectiveProcess, legalFramework] = await Promise.all([
          ctx.db
            .query("documentsDelivered")
            .withIndex("by_individualProcess", (q) =>
              q.eq("individualProcessId", individualProcess._id),
            )
            .collect(),
          individualProcess.collectiveProcessId
            ? cachedGet(individualProcess.collectiveProcessId)
            : null,
          individualProcess.legalFrameworkId
            ? cachedGet(individualProcess.legalFrameworkId)
            : null,
        ]);

        const latestDocuments = documents.filter((document) => document.isLatest);

        return await Promise.all(
          latestDocuments.map(async (document) => {
            const documentType = document.documentTypeId
              ? await cachedGet(document.documentTypeId)
              : null;
            const documentName = documentType?.name ?? document.documentName;

            if (!documentName || !isPassportDocumentName(documentName)) {
              return null;
            }

            const hasFile =
              document.storageId !== undefined ||
              document.fileUrl.trim().length > 0;

            return {
              documentId: document._id,
              individualProcessId: individualProcess._id,
              processReference: collectiveProcess?.referenceNumber ?? null,
              legalFrameworkName: legalFramework?.name ?? null,
              documentName,
              status: document.status,
              currentVersion: document.version,
              currentFileName: hasFile ? document.fileName || null : null,
              hasFile,
            };
          }),
        );
      }),
    );

    return candidatesByProcess
      .flat()
      .filter((candidate) => candidate !== null)
      .sort((a, b) => {
        if (a.hasFile !== b.hasFile) return a.hasFile ? 1 : -1;
        return (a.processReference ?? a.documentName).localeCompare(
          b.processReference ?? b.documentName,
        );
      });
  },
});

/**
 * Attaches a passport's existing storage object to the selected process
 * document. The target and expected version are revalidated transactionally so
 * a stale dialog cannot overwrite a newer upload.
 */
export const attach = mutation({
  args: {
    passportId: v.id("passports"),
    individualProcessId: v.optional(v.id("individualProcesses")),
    documentId: v.id("documentsDelivered"),
    expectedVersion: v.number(),
    mode: attachmentModeValidator,
  },
  returns: v.object({
    documentId: v.id("documentsDelivered"),
    version: v.number(),
    mode: attachmentModeValidator,
  }),
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);
    if (!adminProfile.userId) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }

    const [passport, targetDocument] = await Promise.all([
      ctx.db.get(args.passportId),
      ctx.db.get(args.documentId),
    ]);
    if (!passport?.personId) {
      throw new ConvexError({ code: "PASSPORT_NOT_FOUND" });
    }
    if (!targetDocument) {
      throw new ConvexError({ code: "DOCUMENT_NOT_FOUND" });
    }
    if (!targetDocument.isLatest || targetDocument.version !== args.expectedVersion) {
      throw new ConvexError({ code: "DOCUMENT_VERSION_CONFLICT" });
    }

    const [individualProcess, documentType] = await Promise.all([
      ctx.db.get(targetDocument.individualProcessId),
      targetDocument.documentTypeId
        ? ctx.db.get(targetDocument.documentTypeId)
        : null,
    ]);
    if (!individualProcess || individualProcess.personId !== passport.personId) {
      throw new ConvexError({ code: "DOCUMENT_ACCESS_DENIED" });
    }
    if (
      args.individualProcessId &&
      (targetDocument.individualProcessId !== args.individualProcessId ||
        individualProcess._id !== args.individualProcessId ||
        individualProcess.passportId !== passport._id)
    ) {
      throw new ConvexError({ code: "DOCUMENT_ACCESS_DENIED" });
    }

    const documentName = documentType?.name ?? targetDocument.documentName;
    if (!documentName || !isPassportDocumentName(documentName)) {
      throw new ConvexError({ code: "INVALID_PASSPORT_DOCUMENT" });
    }

    const fileMetadata = await getPassportDocumentFileMetadata(ctx, passport);
    if (!fileMetadata) {
      throw new ConvexError({ code: "PASSPORT_FILE_NOT_FOUND" });
    }

    const targetHasFile =
      targetDocument.storageId !== undefined ||
      targetDocument.fileUrl.trim().length > 0;
    if (!targetHasFile && args.mode !== "fill") {
      throw new ConvexError({ code: "DOCUMENT_MODE_CONFLICT" });
    }
    if (targetHasFile && args.mode === "fill") {
      throw new ConvexError({ code: "DOCUMENT_MODE_CONFLICT" });
    }

    const alreadyUsesPassportFile = passport.storageId
      ? targetDocument.storageId === passport.storageId
      : passport.fileUrl !== undefined &&
        targetDocument.fileUrl === passport.fileUrl;
    if (
      args.mode === "replace" &&
      alreadyUsesPassportFile &&
      targetDocument.status === "approved"
    ) {
      return {
        documentId: targetDocument._id,
        version: targetDocument.version,
        mode: args.mode,
      };
    }

    const uploadedAt = Date.now();
    const processStatusAtUpload = await getProcessStatusAtUpload(
      ctx,
      individualProcess,
    );

    let savedDocumentId = targetDocument._id;
    let savedVersion = Math.max(1, targetDocument.version);

    if (args.mode === "new_version") {
      const processDocuments = await ctx.db
        .query("documentsDelivered")
        .withIndex("by_individualProcess", (q) =>
          q.eq("individualProcessId", targetDocument.individualProcessId),
        )
        .collect();
      const matchingVersions = processDocuments.filter((document) =>
        isSameDocumentGroup(document, targetDocument),
      );
      savedVersion =
        Math.max(...matchingVersions.map((document) => document.version), 0) + 1;

      await ctx.db.patch(targetDocument._id, { isLatest: false });
      savedDocumentId = await ctx.db.insert("documentsDelivered", {
        individualProcessId: targetDocument.individualProcessId,
        documentTypeId: targetDocument.documentTypeId,
        documentRequirementId: targetDocument.documentRequirementId,
        documentTypeLegalFrameworkId:
          targetDocument.documentTypeLegalFrameworkId,
        isRequired: targetDocument.isRequired,
        storageId: fileMetadata.storageId,
        personId: targetDocument.personId ?? individualProcess.personId,
        companyId: targetDocument.companyId,
        fileName: fileMetadata.fileName,
        fileUrl: fileMetadata.fileUrl,
        fileSize: fileMetadata.fileSize,
        mimeType: fileMetadata.mimeType,
        status: "approved",
        uploadedBy: adminProfile.userId,
        uploadedAt,
        createdAt: uploadedAt,
        receivedAt: uploadedAt,
        reviewedBy: adminProfile.userId,
        reviewedAt: uploadedAt,
        expiryDate: passport.expiryDate,
        issueDate: passport.issueDate,
        version: savedVersion,
        isLatest: true,
        versionNotes: PASSPORT_DOCUMENT_ATTACHMENT_NOTE,
        reusedFromDocumentId: targetDocument.reusedFromDocumentId,
        individualProcessStatusId: targetDocument.individualProcessStatusId,
        processStatusAtUpload,
        documentName: targetDocument.documentName,
        excludedFromReport: targetDocument.excludedFromReport,
        bypassConditions: targetDocument.bypassConditions,
      });
    } else {
      const createdAt = getDocumentCreatedAt(targetDocument);
      const receivedAt = targetHasFile
        ? (getDocumentReceivedAt(targetDocument) ?? uploadedAt)
        : uploadedAt;
      await ctx.db.patch(targetDocument._id, {
        storageId: fileMetadata.storageId,
        fileName: fileMetadata.fileName,
        fileUrl: fileMetadata.fileUrl,
        fileSize: fileMetadata.fileSize,
        mimeType: fileMetadata.mimeType,
        status: "approved",
        uploadedBy: adminProfile.userId,
        uploadedAt: receivedAt,
        createdAt,
        receivedAt,
        reviewedBy: adminProfile.userId,
        reviewedAt: uploadedAt,
        rejectionReason: undefined,
        isIllegible: undefined,
        expiryDate: passport.expiryDate,
        issueDate: passport.issueDate,
        version: savedVersion,
        versionNotes: PASSPORT_DOCUMENT_ATTACHMENT_NOTE,
        processStatusAtUpload,
      });
    }

    await ctx.db.insert("documentStatusHistory", {
      documentId: savedDocumentId,
      previousStatus: targetDocument.status,
      newStatus: "approved",
      changedBy: adminProfile.userId,
      changedAt: uploadedAt,
      notes: PASSPORT_DOCUMENT_ATTACHMENT_NOTE,
      metadata: {
        fileName: fileMetadata.fileName,
        version: savedVersion,
        passportId: passport._id,
        attachmentMode: args.mode,
      },
    });

    if (targetDocument.documentTypeId) {
      const shouldCreateConditions =
        args.mode === "new_version" ||
        (await ctx.db
          .query("documentDeliveredConditions")
          .withIndex("by_documentDelivered", (q) =>
            q.eq("documentsDeliveredId", savedDocumentId),
          )
          .first()) === null;

      if (shouldCreateConditions) {
        await ctx.scheduler.runAfter(
          0,
          internal.documentDeliveredConditions.autoCreateForDocument,
          {
            documentsDeliveredId: savedDocumentId,
            documentTypeId: targetDocument.documentTypeId,
            individualProcessId: targetDocument.individualProcessId,
            previousDocumentsDeliveredId:
              args.mode === "new_version" ? targetDocument._id : undefined,
          },
        );
      }
    }

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "uploaded_from_passport",
      entityType: "document",
      entityId: savedDocumentId,
      details: {
        passportId: passport._id,
        passportNumber: passport.passportNumber,
        individualProcessId: targetDocument.individualProcessId,
        documentType: documentName,
        version: savedVersion,
        attachmentMode: args.mode,
      },
    });

    return {
      documentId: savedDocumentId,
      version: savedVersion,
      mode: args.mode,
    };
  },
});
