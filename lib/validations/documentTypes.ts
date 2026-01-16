import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

// Document type categories (legacy - now stored in database)
// Keeping for backward compatibility with existing data
export const legacyDocumentCategories = [
  "Identity",
  "Work",
  "Education",
  "Financial",
  "Legal",
  "Other",
] as const;

// Common file types
export const commonFileTypes = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
] as const;

// Default max file size in MB
export const DEFAULT_MAX_FILE_SIZE_MB = 50;

// Legal framework association schema
export const legalFrameworkAssociationSchema = z.object({
  legalFrameworkId: z.string(),
  isRequired: z.boolean(),
});

export type LegalFrameworkAssociation = {
  legalFrameworkId: Id<"legalFrameworks">;
  isRequired: boolean;
};

export const documentTypeSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  code: z
    .string()
    .min(1, "Code must be at least 1 character")
    .regex(/^[A-Z0-9_]+$/, "Code must contain only uppercase letters, numbers, and underscores")
    .transform((val) => val.toUpperCase().replace(/\s+/g, ""))
    .optional()
    .or(z.literal("")),
  category: z.string().optional(), // Now accepts any category code from database
  description: z.string().min(10, "Description must be at least 10 characters").optional().or(z.literal("")),
  allowedFileTypes: z.array(z.string()).optional(),
  maxFileSizeMB: z.number().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  legalFrameworkAssociations: z.array(legalFrameworkAssociationSchema).optional(),
});

export type DocumentTypeFormData = z.infer<typeof documentTypeSchema>;
