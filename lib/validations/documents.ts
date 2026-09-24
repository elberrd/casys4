import { z } from "zod";
import { OBSERVACOES_MAX_LENGTH } from "@/lib/validations/observacoes";

export const documentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  documentTypeId: z.string().min(1, "Document type ID must be valid").optional().or(z.literal("")),
  personId: z.string().optional(),
  companyId: z.string().optional(),
  individualProcessId: z.string().optional(),
  userApplicantId: z.string().optional(),
  storageId: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  notes: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type DocumentFormData = z.infer<typeof documentSchema>;

export const documentNewVersionSchema = z.object({
  storageId: z.string().min(1, "Storage ID is required"),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().min(1, "File size must be greater than 0"),
  fileType: z.string().min(1, "File type is required"),
  versionNotes: z.string().max(OBSERVACOES_MAX_LENGTH).optional(),
  expiryDate: z.string().optional(),
});

export type DocumentNewVersionFormData = z.infer<typeof documentNewVersionSchema>;
