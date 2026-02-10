import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Schema for uploading a loose document (without document type)
 */
export const looseDocumentUploadSchema = z.object({
  individualProcessId: z.string(),
  storageId: z.string(),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().min(1, "File size must be greater than 0"),
  mimeType: z.string().min(1, "MIME type is required"),
  expiryDate: z.string().optional(),
  issueDate: z.string().optional(),
  versionNotes: z.string().max(500).optional(),
});

export type LooseDocumentUploadData = {
  individualProcessId: Id<"individualProcesses">;
  storageId: Id<"_storage">;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiryDate?: string;
};

/**
 * Schema for uploading a document with a specific type
 */
export const typedDocumentUploadSchema = z.object({
  individualProcessId: z.string(),
  documentTypeId: z.string(),
  storageId: z.string(),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().min(1, "File size must be greater than 0"),
  mimeType: z.string().min(1, "MIME type is required"),
  expiryDate: z.string().optional(),
  issueDate: z.string().optional(),
  versionNotes: z.string().max(500).optional(),
});

export type TypedDocumentUploadData = {
  individualProcessId: Id<"individualProcesses">;
  documentTypeId: Id<"documentTypes">;
  storageId: Id<"_storage">;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiryDate?: string;
};

/**
 * Schema for assigning a document type to a loose document
 */
export const assignDocumentTypeSchema = z.object({
  documentId: z.string(),
  documentTypeId: z.string(),
});

export type AssignDocumentTypeData = {
  documentId: Id<"documentsDelivered">;
  documentTypeId: Id<"documentTypes">;
};

/**
 * Schema for uploading a file for a pre-populated pending document
 */
export const pendingDocumentUploadSchema = z.object({
  documentId: z.string(),
  storageId: z.string(),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().min(1, "File size must be greater than 0"),
  mimeType: z.string().min(1, "MIME type is required"),
  expiryDate: z.string().optional(),
  issueDate: z.string().optional(),
  versionNotes: z.string().max(500).optional(),
});

export type PendingDocumentUploadData = {
  documentId: Id<"documentsDelivered">;
  storageId: Id<"_storage">;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiryDate?: string;
};

/**
 * Document status options
 */
export const documentStatusOptions = [
  "not_started",
  "uploaded",
  "under_review",
  "approved",
  "rejected",
] as const;

export type DocumentStatus = (typeof documentStatusOptions)[number];

/**
 * Helper function to validate file type against allowed types
 */
export function validateFileType(
  fileName: string,
  allowedFileTypes: string[] | undefined
): { valid: boolean; message?: string } {
  if (!allowedFileTypes || allowedFileTypes.length === 0) {
    return { valid: true };
  }

  const fileExtension = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  const isAllowed = allowedFileTypes.some(
    (allowed) => allowed.toLowerCase() === fileExtension
  );

  if (!isAllowed) {
    return {
      valid: false,
      message: `File type not allowed. Allowed types: ${allowedFileTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Helper function to validate file size against maximum allowed
 */
export function validateFileSize(
  fileSize: number,
  maxFileSizeMB: number | undefined
): { valid: boolean; message?: string } {
  if (!maxFileSizeMB) {
    return { valid: true };
  }

  const fileSizeMB = fileSize / (1024 * 1024);
  if (fileSizeMB > maxFileSizeMB) {
    return {
      valid: false,
      message: `File size exceeds maximum allowed (${maxFileSizeMB}MB)`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
