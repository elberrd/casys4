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
    .min(1, "Code is required")
    .regex(/^[A-Z0-9_]+$/, "Code must contain only uppercase letters, numbers, and underscores")
    .transform((val) => val.toUpperCase().replace(/\s+/g, "")),
  category: z.enum(documentCategories, {
    errorMap: () => ({ message: "Please select a valid category" }),
  }),
  description: z.string().min(10, "Description must be at least 10 characters"),
  isActive: z.boolean().default(true),
});

export type DocumentTypeFormData = z.infer<typeof documentTypeSchema>;
