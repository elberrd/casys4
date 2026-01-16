import { z } from "zod";

// Schema for document type association with legal framework
export const documentTypeAssociationSchema = z.object({
  documentTypeId: z.string(),
  isRequired: z.boolean(),
});

export type DocumentTypeAssociation = z.infer<typeof documentTypeAssociationSchema>;

export const legalFrameworkSchema = z.object({
  name: z.string().min(1, "Legal framework name is required"),
  description: z.string().min(1, "Description must be at least 1 character").optional().or(z.literal("")),
  processTypeIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  documentTypeAssociations: z.array(documentTypeAssociationSchema).optional(),
});

export type LegalFrameworkFormData = z.infer<typeof legalFrameworkSchema>;
