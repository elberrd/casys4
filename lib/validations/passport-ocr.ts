import { z } from "zod"

import type { Id } from "@/convex/_generated/dataModel"

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value

const optionalTextSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).nullish()
)

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const optionalIsoDateSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .refine(isValidIsoDate, "Expected a valid date in YYYY-MM-DD format")
    .nullish()
)

const optionalCountryIdSchema = z
  .custom<Id<"countries">>(
    (value) => typeof value === "string" && value.length > 0,
    "Expected a valid country ID"
  )
  .nullish()

const storageIdSchema = z.custom<Id<"_storage">>(
  (value) => typeof value === "string" && value.length > 0,
  "Expected a valid storage ID"
)

/**
 * Validates only the OCR fields consumed by the administrative passport form.
 * Other response properties (person matches, nationality and MRZ) are ignored.
 */
export const adminPassportOcrSchema = z.object({
  extracted: z.object({
    passportNumber: optionalTextSchema,
    issueDate: optionalIsoDateSchema,
    expiryDate: optionalIsoDateSchema,
  }),
  issuingCountryId: optionalCountryIdSchema,
  error: z.literal("invalid_response").nullable(),
})

export const passportUploadResponseSchema = z.object({
  storageId: storageIdSchema,
})

const personIdSchema = z.custom<Id<"people">>(
  (value) => typeof value === "string" && value.length > 0,
  "Expected a valid person ID"
)

/**
 * Validates the OCR subset consumed by the full Person form. The transform
 * keeps passport-domain properties out of the form callback while preserving
 * the duplicate signals that the UI must surface before creating a person.
 */
export const personPassportOcrSchema = z
  .object({
    extracted: z.object({
      givenNames: optionalTextSchema,
      middleName: optionalTextSchema,
      surname: optionalTextSchema,
      fatherName: optionalTextSchema,
      motherName: optionalTextSchema,
      passportNumber: optionalTextSchema,
      sex: z.enum(["Male", "Female"]).nullish(),
      birthDate: optionalIsoDateSchema,
    }),
    nationalityId: optionalCountryIdSchema,
    matches: z.array(
      z.object({
        _id: personIdSchema,
        fullName: z.string().trim().min(1),
      })
    ),
    passportExists: z
      .object({
        isAvailable: z.boolean(),
        existingPassport: z
          .object({
            passportNumber: z.string().trim().min(1),
            personId: personIdSchema.nullable(),
            personName: z.string().trim().min(1),
          })
          .nullable(),
      })
      .nullable(),
    error: z.literal("invalid_response").nullable(),
  })
  .transform((result) => ({
    personFields: {
      givenNames: result.extracted.givenNames,
      middleName: result.extracted.middleName,
      surname: result.extracted.surname,
      fatherName: result.extracted.fatherName,
      motherName: result.extracted.motherName,
      sex: result.extracted.sex,
      birthDate: result.extracted.birthDate,
      nationalityId: result.nationalityId,
    },
    passportNumber: result.extracted.passportNumber,
    matches: result.matches,
    passportExists: result.passportExists,
    error: result.error,
  }))

export type AdminPassportOcrResult = z.infer<typeof adminPassportOcrSchema>
export type PersonPassportOcrFields = z.infer<
  typeof personPassportOcrSchema
>["personFields"]
