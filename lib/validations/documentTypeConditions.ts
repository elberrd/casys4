import { z } from "zod";

/**
 * Schema for document type condition form data
 * Note: documentTypeId is optional since conditions are now global
 * It's only used when creating a new condition that should be auto-linked to a document type
 */
export const documentTypeConditionSchema = z.object({
  // Optional - only used when creating from a document type's condition section
  documentTypeId: z.string().optional().or(z.literal("")),
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z
    .string()
    .regex(
      /^[A-Z0-9_]*$/,
      "Code must contain only uppercase letters, numbers, and underscores"
    )
    .optional()
    .or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  isRequired: z.boolean(),
  relativeExpirationDays: z
    .number()
    .min(1, "Expiration days must be at least 1")
    .max(3650, "Expiration days cannot exceed 10 years (3650 days)")
    .optional()
    .nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().optional().nullable(),
});

export type DocumentTypeConditionFormData = z.infer<
  typeof documentTypeConditionSchema
>;

/**
 * Helper function to generate a condition code from a name
 * Converts to uppercase, replaces spaces with underscores, removes special characters
 */
export function generateConditionCodeFromName(name: string): string {
  return name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

/**
 * Default values for a new condition
 */
export const defaultConditionValues: Partial<DocumentTypeConditionFormData> = {
  isRequired: true,
  isActive: true,
  code: "",
  description: "",
  relativeExpirationDays: null,
  sortOrder: null,
  documentTypeId: "",
};
