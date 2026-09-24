import { z } from "zod";
import {
  isBrazilAddress,
  isValidReportedAt,
  processAddressRejectsNonBrazil,
  type StructuredAddressFields,
} from "@/lib/utils/address-fields";

export const reportedAtSchema = z
  .string()
  .min(1, "Reported date is required")
  .refine((value) => isValidReportedAt(value), {
    message: "Reported date must use YYYY-MM-DD format",
  });

export const optionalReportedAtSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => !value || isValidReportedAt(value),
    { message: "Reported date must use YYYY-MM-DD format" },
  );

export function personAddressCountryIssue(
  source: Partial<StructuredAddressFields>,
): string | null {
  if (isBrazilAddress(source)) {
    return "PERSON_ADDRESS_MUST_BE_ABROAD";
  }
  return null;
}

export function processAddressCountryIssue(
  source: Partial<StructuredAddressFields>,
): string | null {
  if (processAddressRejectsNonBrazil(source)) {
    return "PROCESS_ADDRESS_MUST_BE_BRAZIL";
  }
  return null;
}

export function reportedAtIssue(
  value: string | undefined | null,
  required: boolean,
): string | null {
  if (!value || value.trim() === "") {
    return required ? "REPORTED_AT_REQUIRED" : null;
  }
  if (!isValidReportedAt(value)) {
    return "INVALID_REPORTED_AT";
  }
  return null;
}

export function assertPersonAddressNotBrazil(
  source: Partial<StructuredAddressFields>,
): void {
  const issue = personAddressCountryIssue(source);
  if (issue) {
    throw new Error(issue);
  }
}

export function assertProcessAddressIsBrazil(
  source: Partial<StructuredAddressFields>,
): void {
  const issue = processAddressCountryIssue(source);
  if (issue) {
    throw new Error(issue);
  }
}

export function assertReportedAt(
  value: string | undefined | null,
  required = true,
): void {
  const issue = reportedAtIssue(value, required);
  if (issue) {
    throw new Error(issue);
  }
}
