import { z } from "zod";

// Document type categories
export const documentCategories = [
  "Identity",
  "Work",
  "Education",
  "Financial",
  "Legal",
  "Other",
] as const;

export const documentTypeSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  code: z
    .string()
    .min(1, "Code must be at least 1 character")
    .regex(/^[A-Z0-9_]+$/, "Code must contain only uppercase letters, numbers, and underscores")
    .transform((val) => val.toUpperCase().replace(/\s+/g, ""))
    .optional()
    .or(z.literal("")),
  category: z.enum(documentCategories, {
    message: "Please select a valid category",
  }).optional(),
  description: z.string().min(10, "Description must be at least 10 characters").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type DocumentTypeFormData = z.infer<typeof documentTypeSchema>;
