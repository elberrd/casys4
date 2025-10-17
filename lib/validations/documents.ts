import { z } from "zod";

export const documentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  documentTypeId: z.string().min(1, "Document type is required"),
  personId: z.string().optional(),
  companyId: z.string().optional(),
  storageId: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  notes: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type DocumentFormData = z.infer<typeof documentSchema>;
