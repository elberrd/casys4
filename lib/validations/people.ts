import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";
import { cleanDocumentNumber, isValidCPF } from "@/lib/utils/document-masks";
import { optionalPhoneNumberSchema } from "@/lib/validations/phone";
import {
  hasSubstantiveAddressFields,
  isBrazilAddress,
  isBrazilFlagOnly,
  isValidReportedAt,
  trimOptional,
} from "@/lib/utils/address-fields";

// CPF validation regex (accepts both formatted XXX.XXX.XXX-XX and unformatted XXXXXXXXXXX)
const cpfRegex = /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/;

export const personSchema = z.object({
  givenNames: z.string().min(2, "Given names must be at least 2 characters"),
  middleName: z.string().optional().or(z.literal("")),
  surname: z.string().optional().or(z.literal("")),
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
  sex: z.enum(["Male", "Female"], {
    message: "Please select a sex",
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
  addressIsBrazil: z.boolean().optional(),
  addressStreet: z.string().optional().or(z.literal("")),
  addressNumber: z.string().optional().or(z.literal("")),
  addressComplement: z.string().optional().or(z.literal("")),
  addressNeighborhood: z.string().optional().or(z.literal("")),
  addressCountryCode: z.string().optional().or(z.literal("")),
  addressCountryName: z.string().optional().or(z.literal("")),
  addressStateCode: z.string().optional().or(z.literal("")),
  addressStateName: z.string().optional().or(z.literal("")),
  addressCity: z.string().optional().or(z.literal("")),
  addressPostalCode: z.string().optional().or(z.literal("")),
  reportedAt: z.string().optional().or(z.literal("")),
  currentCityId: z.custom<Id<"cities">>((val) => typeof val === "string" && val.length > 0, {
    message: "Current city ID must be valid",
  }).optional().or(z.literal("")),
  photoUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  residenceSince: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  // Old checkbox default: BR flag/country with no street/city/etc. is not an
  // address. Forms strip it; validation must not fail other field edits.
  if (isBrazilFlagOnly(data)) {
    return;
  }
  if (isBrazilAddress(data)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["addressCountryCode"],
      message: "PERSON_ADDRESS_MUST_BE_ABROAD",
    });
  }
  const hasAddressContent =
    hasSubstantiveAddressFields(data) ||
    Boolean(trimOptional(data.addressCountryCode)) ||
    Boolean(trimOptional(data.addressCountryName));
  if (hasAddressContent) {
    if (!data.reportedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reportedAt"],
        message: "REPORTED_AT_REQUIRED",
      });
    } else if (!isValidReportedAt(data.reportedAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reportedAt"],
        message: "INVALID_REPORTED_AT",
      });
    }
  }
});

export type PersonFormData = z.infer<typeof personSchema>;

// Sex options for form selects
export const sexOptions = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
] as const;

export const sexTranslationKeys = {
  Male: "sexMale",
  Female: "sexFemale",
} as const;

// Marital status options for form selects
export const maritalStatusOptions = [
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Divorced", label: "Divorced" },
  { value: "Widowed", label: "Widowed" },
] as const;

export const maritalStatusTranslationKeys = {
  Single: "maritalStatusSingle",
  Married: "maritalStatusMarried",
  Divorced: "maritalStatusDivorced",
  Widowed: "maritalStatusWidowed",
} as const;
