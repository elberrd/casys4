import { z } from "zod";

export const processTypeSchema = z.object({
  name: z.string().min(1, "Process type name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .transform((val) => val.toUpperCase()),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  estimatedDays: z
    .number()
    .int("Estimated days must be an integer")
    .positive("Estimated days must be positive"),
  isActive: z.boolean(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export type ProcessTypeFormData = z.infer<typeof processTypeSchema>;
