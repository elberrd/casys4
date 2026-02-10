import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const legalFrameworkInfoRequirementSchema = z.object({
  legalFrameworkId: z.custom<Id<"legalFrameworks">>((val) => typeof val === "string" && val.length > 0, {
    message: "Legal framework is required",
  }),
  entityType: z.enum(["person", "individualProcess", "passport", "company"], {
    message: "Entity type is required",
  }),
  fieldPath: z.string().min(1, "Field is required"),
  label: z.string().min(1, "Label is required"),
  labelEn: z.string().optional().or(z.literal("")),
  fieldType: z.string().optional().or(z.literal("")),
  responsibleParty: z.enum(["client", "admin", "company"], {
    message: "Responsible party is required",
  }),
  isRequired: z.boolean(),
  sortOrder: z.number().min(0),
});

export type LegalFrameworkInfoRequirementFormData = z.infer<typeof legalFrameworkInfoRequirementSchema>;
