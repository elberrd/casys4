import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getProcessStatusAtUpload } from "./documentProgressSnapshot";

/**
 * Note stored on the auto-sent passport document (in versionNotes and in the
 * status history) so the provenance is auditable. Portuguese, matching the
 * existing convention for backend-generated notes (e.g. "Documento ilegível").
 */
const AUTO_NOTE =
  "Enviado automaticamente a partir das informações do passaporte";

function mimeTypeToExtension(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return ".pdf";
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}

/**
 * Auto-marks the "Passaporte" document of a process as sent ("uploaded") when the
 * linked passport is fully filled (all data fields + the photo/file).
 *
 * The passport document type is identified by its field mappings
 * (`entityType === "passport"` in `documentTypeFieldMappings`), which is
 * language-independent — it works whether the document type is named
 * "Passaporte" or "Passport".
 *
 * Behavior (per product decision):
 * - Only advances documents from "not_started" -> "uploaded". It never downgrades
 *   nor touches documents already uploaded/approved/rejected (no auto-revert, and
 *   never clobbers an admin decision).
 * - Copies the passport file (storageId / fileUrl / metadata) onto the document so
 *   it stays viewable everywhere fileUrl is read.
 *
 * Returns true if at least one document was updated.
 */
export async function syncPassportDocumentForProcess(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
): Promise<boolean> {
  const process = await ctx.db.get(individualProcessId);
  if (!process?.passportId) return false;

  const passport = await ctx.db.get(process.passportId);
  if (!passport) return false;

  // "Complete" = all data fields filled AND a file attached (the photo, mandatory
  // to trigger). The file stays optional in the form; we simply don't fire without it.
  const isComplete =
    !!passport.passportNumber &&
    !!passport.issuingCountryId &&
    !!passport.issueDate &&
    !!passport.expiryDate &&
    !!(passport.storageId || passport.fileUrl);
  if (!isComplete) return false;

  // Identify the passport document type(s) by their active field mappings.
  const passportMappings = await ctx.db
    .query("documentTypeFieldMappings")
    .withIndex("by_entityType_fieldPath", (q) => q.eq("entityType", "passport"))
    .collect();
  const passportDocTypeIds = new Set(
    passportMappings
      .filter((m) => m.isActive)
      .map((m) => m.documentTypeId.toString()),
  );
  if (passportDocTypeIds.size === 0) return false;

  // Find this process's latest passport document(s) still pending.
  const deliveredDocs = await ctx.db
    .query("documentsDelivered")
    .withIndex("by_individualProcess", (q) =>
      q.eq("individualProcessId", individualProcessId),
    )
    .collect();
  const pendingPassportDocs = deliveredDocs.filter(
    (doc) =>
      doc.isLatest &&
      doc.status === "not_started" &&
      !!doc.documentTypeId &&
      passportDocTypeIds.has(doc.documentTypeId.toString()),
  );
  if (pendingPassportDocs.length === 0) return false;

  // Resolve the file once (shared across all matching documents).
  const fileUrl =
    passport.fileUrl ??
    (passport.storageId
      ? (await ctx.storage.getUrl(passport.storageId)) ?? undefined
      : undefined);
  if (!fileUrl) return false; // Defensive: completeness implied a file.

  let mimeType = "application/octet-stream";
  let fileSize = 0;
  if (passport.storageId) {
    const meta = await ctx.db.system.get(passport.storageId);
    if (meta) {
      mimeType = meta.contentType ?? mimeType;
      fileSize = meta.size ?? 0;
    }
  }
  const fileName = `Passaporte ${passport.passportNumber}${mimeTypeToExtension(mimeType)}`;

  const actingUserId = await getAuthUserId(ctx);
  const now = Date.now();
  const processStatusAtUpload = await getProcessStatusAtUpload(ctx, process);

  let updatedAny = false;
  for (const doc of pendingPassportDocs) {
    // In a system context (no acting user) keep the document's existing uploader.
    const uploadedBy = actingUserId ?? doc.uploadedBy;

    await ctx.db.patch(doc._id, {
      status: "uploaded",
      storageId: passport.storageId,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      issueDate: passport.issueDate,
      expiryDate: passport.expiryDate,
      uploadedBy,
      uploadedAt: now,
      versionNotes: AUTO_NOTE,
      processStatusAtUpload: doc.processStatusAtUpload ?? processStatusAtUpload,
    });

    await ctx.db.insert("documentStatusHistory", {
      documentId: doc._id,
      previousStatus: "not_started",
      newStatus: "uploaded",
      changedBy: uploadedBy,
      changedAt: now,
      notes: AUTO_NOTE,
      metadata: {
        fileName,
        autoFromPassport: true,
        passportId: passport._id,
      },
    });

    // Auto-create conditions for this document (parity with the upload flow).
    if (doc.documentTypeId) {
      await ctx.scheduler.runAfter(
        0,
        internal.documentDeliveredConditions.autoCreateForDocument,
        {
          documentsDeliveredId: doc._id,
          documentTypeId: doc.documentTypeId,
          individualProcessId,
        },
      );
    }

    updatedAny = true;
  }

  return updatedAny;
}

/**
 * Convenience trigger for the passport side: syncs every process that references
 * the given passport. Used after a passport is created/updated (e.g. the admin
 * fills the missing data or attaches the photo in the "Informações do Passaporte"
 * card). Returns how many processes had a document marked as sent.
 */
export async function syncPassportDocumentForPassport(
  ctx: MutationCtx,
  passportId: Id<"passports">,
): Promise<number> {
  const processes = await ctx.db
    .query("individualProcesses")
    .withIndex("by_passport", (q) => q.eq("passportId", passportId))
    .collect();

  let count = 0;
  for (const process of processes) {
    if (await syncPassportDocumentForProcess(ctx, process._id)) count++;
  }
  return count;
}
