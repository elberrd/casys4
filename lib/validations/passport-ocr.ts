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

export type AdminPassportOcrResult = z.infer<typeof adminPassportOcrSchema>
