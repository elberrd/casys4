import { z } from "zod";

export const reportTemplateFormSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional().or(z.literal("")),
  contentHtml: z.string(),
  isActive: z.boolean(),
  legalFrameworkId: z.string().optional().or(z.literal("")),
  documentTypeIds: z.array(z.string()),
});

export type ReportTemplateFormData = z.infer<typeof reportTemplateFormSchema>;
