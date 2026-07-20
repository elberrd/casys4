import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { normalizeString } from "./stringUtils";

export const PASSPORT_DOCUMENT_ATTACHMENT_NOTE =
  "Anexado e aprovado automaticamente a partir do arquivo do passaporte";

const PASSPORT_DOCUMENT_NAMES = new Set([
  "passaporte",
  "passaporte valido",
  "passport",
  "valid passport",
]);

function normalizeDocumentName(name: string): string {
  return normalizeString(name).trim().replace(/\s+/g, " ");
}

export function isPassportDocumentName(name: string): boolean {
  return PASSPORT_DOCUMENT_NAMES.has(normalizeDocumentName(name));
}

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

export interface PassportDocumentFileMetadata {
  storageId?: Id<"_storage">;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Resolves trusted file metadata directly from Convex Storage. Legacy
 * passports with only a file URL remain attachable with conservative metadata.
 */
export async function getPassportDocumentFileMetadata(
  ctx: MutationCtx,
  passport: Doc<"passports">,
): Promise<PassportDocumentFileMetadata | null> {
  const fileUrl = passport.storageId
    ? ((await ctx.storage.getUrl(passport.storageId)) ?? passport.fileUrl)
    : passport.fileUrl;
  if (!fileUrl) return null;

  let fileSize = 0;
  let mimeType = "application/octet-stream";
  if (passport.storageId) {
    const metadata = await ctx.db.system.get(passport.storageId);
    if (metadata) {
      fileSize = metadata.size;
      mimeType = metadata.contentType ?? mimeType;
    }
  }

  return {
    storageId: passport.storageId,
    fileUrl,
    fileName: `Passaporte ${passport.passportNumber}${mimeTypeToExtension(mimeType)}`,
    fileSize,
    mimeType,
  };
}
