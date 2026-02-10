import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const documentTypeFieldMappingSchema = z.object({
  documentTypeId: z.custom<Id<"documentTypes">>((val) => typeof val === "string" && val.length > 0, {
    message: "Document type is required",
  }),
  entityType: z.enum(["person", "individualProcess", "passport", "company"], {
    message: "Entity type is required",
  }),
  fieldPath: z.string().min(1, "Field is required"),
  label: z.string().min(1, "Label is required"),
  labelEn: z.string().optional().or(z.literal("")),
  fieldType: z.string().optional().or(z.literal("")),
  isRequired: z.boolean(),
  sortOrder: z.number().min(0),
});

export type DocumentTypeFieldMappingFormData = z.infer<typeof documentTypeFieldMappingSchema>;
