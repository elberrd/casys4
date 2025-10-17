import { z } from "zod";

export const legalFrameworkSchema = z.object({
  name: z.string().min(1, "Legal framework name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .transform((val) => val.toUpperCase()),
  description: z.string().min(1, "Description is required"),
  isActive: z.boolean(),
});

export type LegalFrameworkFormData = z.infer<typeof legalFrameworkSchema>;
