import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const PERSON_PASSPORT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const PERSON_PASSPORT_ACCEPTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

export function normalizePersonPassportFileName(fileName: string): string {
  const normalized = fileName.trim();
  if (!normalized) throw new Error("File name is required");
  if (normalized.length > 255) throw new Error("File name is too long");
  return normalized;
}

export async function validatePersonPassportUpload(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
) {
  const metadata = await ctx.db.system.get(storageId);
  if (!metadata) throw new Error("Uploaded passport was not found");

  const mimeType = metadata.contentType ?? "application/octet-stream";
  if (!PERSON_PASSPORT_ACCEPTED_MIME_TYPES.has(mimeType)) {
    throw new Error("Unsupported passport file type");
  }
  if (metadata.size > PERSON_PASSPORT_MAX_FILE_SIZE_BYTES) {
    throw new Error("Passport file exceeds the 10 MB limit");
  }

  return { mimeType, fileSize: metadata.size };
}
