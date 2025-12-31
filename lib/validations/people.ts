import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";
import { cleanDocumentNumber, isValidCPF } from "@/lib/utils/document-masks";
import { optionalPhoneNumberSchema } from "@/lib/validations/phone";

// CPF validation regex (accepts both formatted XXX.XXX.XXX-XX and unformatted XXXXXXXXXXX)
const cpfRegex = /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/;

export const personSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  cpf: z
    .union([
      z.literal(""),
      z.string()
        .refine((val) => cpfRegex.test(val), {
          message: "Invalid CPF format",
        })
        .refine((val) => isValidCPF(val), {
          message: "Invalid CPF check digits",
        })
        .transform((val) => cleanDocumentNumber(val)),
    ])
    .optional(),
  birthDate: z.string().optional().or(z.literal("")),
  birthCityId: z.custom<Id<"cities">>((val) => typeof val === "string" && val.length > 0, {
    message: "Birth city ID must be valid",
  }).optional().or(z.literal("")),
  nationalityId: z.custom<Id<"countries">>((val) => typeof val === "string" && val.length > 0, {
    message: "Nationality ID must be valid",
  }).optional().or(z.literal("")),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"], {
    message: "Please select a marital status",
  }).optional().or(z.literal("")),
  profession: z.string().min(1, "Profession must be valid").optional().or(z.literal("")),
  cargo: z.string().min(1, "Position must be valid").optional().or(z.literal("")),
  motherName: z.string().min(1, "Mother's name must be valid").optional().or(z.literal("")),
  fatherName: z.string().min(1, "Father's name must be valid").optional().or(z.literal("")),
  phoneNumber: optionalPhoneNumberSchema,
  address: z.string().min(1, "Address must be valid").optional().or(z.literal("")),
  currentCityId: z.custom<Id<"cities">>((val) => typeof val === "string" && val.length > 0, {
    message: "Current city ID must be valid",
  }).optional().or(z.literal("")),
  photoUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  // Company relationship fields
  companyId: z.custom<Id<"companies">>((val) => typeof val === "string" && val.length > 0, {
    message: "Company ID must be valid",
  }).optional().or(z.literal("")),
});

export type PersonFormData = z.infer<typeof personSchema>;

// Marital status options for form selects
export const maritalStatusOptions = [
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Divorced", label: "Divorced" },
  { value: "Widowed", label: "Widowed" },
] as const;
