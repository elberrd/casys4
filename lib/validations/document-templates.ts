import { z } from "zod";

/**
 * Validation schema for document template
 */
export const documentTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(200, "Template name must be less than 200 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(1000, "Description must be less than 1000 characters"),
  processTypeId: z.string().min(1, "Process type is required"),
  legalFrameworkId: z.string().optional(),
  isActive: z.boolean(),
});

export type DocumentTemplateFormData = z.infer<typeof documentTemplateSchema>;

/**
 * Validation schema for document requirement
 */
export const documentRequirementSchema = z.object({
  documentTypeId: z.string().min(1, "Document type is required"),
  isRequired: z.boolean(),
  isCritical: z.boolean(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  exampleUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  maxSizeMB: z
    .number()
    .min(0.1, "Max size must be at least 0.1 MB")
    .max(100, "Max size cannot exceed 100 MB"),
  allowedFormats: z
    .array(z.string())
    .min(1, "At least one format is required"),
  validityDays: z
    .number()
    .min(1, "Validity days must be at least 1")
    .max(3650, "Validity days cannot exceed 10 years")
    .optional(),
  requiresTranslation: z.boolean(),
  requiresNotarization: z.boolean(),
  sortOrder: z.number().optional(),
});

export type DocumentRequirementFormData = z.infer<
  typeof documentRequirementSchema
>;

/**
 * Combined schema for template with requirements
 */
export const documentTemplateWithRequirementsSchema = z.object({
  template: documentTemplateSchema,
  requirements: z.array(documentRequirementSchema),
});

export type DocumentTemplateWithRequirementsFormData = z.infer<
  typeof documentTemplateWithRequirementsSchema
>;

/**
 * Common file format options
 */
export const FILE_FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "jpg", label: "JPG" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
  { value: "doc", label: "DOC" },
  { value: "docx", label: "DOCX" },
  { value: "xls", label: "XLS" },
  { value: "xlsx", label: "XLSX" },
] as const;
