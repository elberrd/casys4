import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";
import { cleanDocumentNumber, isValidCNPJ } from "@/lib/utils/document-masks";

// CNPJ validation regex (accepts both formatted XX.XXX.XXX/XXXX-XX and unformatted XXXXXXXXXXXXXX)
const cnpjRegex = /^(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})$/;

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  taxId: z
    .string()
    .regex(cnpjRegex, "Invalid CNPJ format")
    .refine((val) => !val || val === "" || isValidCNPJ(val), {
      message: "Invalid CNPJ check digits",
    })
    .transform((val) => (val ? cleanDocumentNumber(val) : val))
    .optional()
    .or(z.literal("")),
  website: z.string().url("Invalid URL format").optional().or(z.literal("")),
  address: z.string().min(1, "Address must be valid").optional().or(z.literal("")),
  cityId: z
    .custom<Id<"cities">>((val) => typeof val === "string", {
      message: "City ID must be valid",
    })
    .optional()
    .or(z.literal("")),
  phoneNumber: z.string().min(1, "Phone number must be valid").optional().or(z.literal("")),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  contactPersonId: z
    .custom<Id<"people">>((val) => typeof val === "string", {
      message: "Invalid contact person",
    })
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional(),
  notes: z.string().optional().or(z.literal("")),
});

export type CompanyFormData = z.infer<typeof companySchema>;
