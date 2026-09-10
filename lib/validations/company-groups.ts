import { z } from "zod";

export const companyGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type CompanyGroupFormData = z.infer<typeof companyGroupSchema>;
