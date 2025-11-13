import { z } from "zod";

export const legalFrameworkSchema = z.object({
  name: z.string().min(1, "Legal framework name is required"),
  description: z.string().min(1, "Description must be at least 1 character").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type LegalFrameworkFormData = z.infer<typeof legalFrameworkSchema>;
