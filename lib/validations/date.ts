import { z } from "zod";

/**
 * Date validation utility module for manual date entry
 * Supports locale-specific date formats with professional Zod validation
 */

/**
 * Parses a manual date entry string in locale-specific format
 * @param dateString - The date string to parse (dd/MM/yyyy for pt, MM/dd/yyyy for en)
 * @param locale - The locale string ('pt' or 'en')
 * @returns A Date object if parsing succeeds, undefined otherwise
 */
export function parseManualDateEntry(
  dateString: string,
  locale: string
): Date | undefined {
  if (!dateString || typeof dateString !== "string") {
    return undefined;
  }

  // Remove extra whitespace and normalize
  const normalized = dateString.trim();

  // Check basic format: must have exactly 2 slashes
  const slashCount = (normalized.match(/\//g) || []).length;
  if (slashCount !== 2) {
    return undefined;
  }

  // Split into parts
  const parts = normalized.split("/");
  if (parts.length !== 3) {
    return undefined;
  }

  // Parse based on locale
  let day: number, month: number, year: number;

  if (locale === "pt") {
    // dd/MM/yyyy format
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    // MM/dd/yyyy format (en and default)
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }

  // Check for NaN
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return undefined;
  }

  // Basic range checks
  if (month < 1 || month > 12) {
    return undefined;
  }

  if (day < 1 || day > 31) {
    return undefined;
  }

  // Validate year is within reasonable range
  if (year < 1900 || year > 2100) {
    return undefined;
  }

  // Create date object (month is 0-indexed in JavaScript Date)
  const date = new Date(year, month - 1, day);

  // Verify the date is valid (JavaScript Date will adjust invalid dates)
  // For example, Feb 30 becomes Mar 2, so we check if the day/month match
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

/**
 * Validates a date string and returns validation result with error message key
 * @param dateString - The date string to validate
 * @param locale - The locale string ('pt' or 'en')
 * @returns Object with valid flag and optional error message key for i18n
 */
export function validateDateString(
  dateString: string,
  locale: string
): { valid: boolean; error?: string } {
  if (!dateString || typeof dateString !== "string") {
    return { valid: false, error: "Common.datePicker.invalidDate" };
  }

  const normalized = dateString.trim();

  // Check format
  const expectedFormat = locale === "pt" ? "dd/MM/yyyy" : "MM/dd/yyyy";
  const formatRegex = locale === "pt"
    ? /^\d{1,2}\/\d{1,2}\/\d{4}$/
    : /^\d{1,2}\/\d{1,2}\/\d{4}$/;

  if (!formatRegex.test(normalized)) {
    return { valid: false, error: "Common.datePicker.invalidFormat" };
  }

  const parts = normalized.split("/");
  const day = locale === "pt" ? parseInt(parts[0], 10) : parseInt(parts[1], 10);
  const month = locale === "pt" ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
  const year = parseInt(parts[2], 10);

  // Validate month
  if (isNaN(month) || month < 1 || month > 12) {
    return { valid: false, error: "Common.datePicker.invalidMonth" };
  }

  // Validate year range
  if (isNaN(year) || year < 1900 || year > 2100) {
    return { valid: false, error: "Common.datePicker.dateOutOfRange" };
  }

  // Validate day for the specific month
  if (isNaN(day) || day < 1) {
    return { valid: false, error: "Common.datePicker.invalidDay" };
  }

  // Check days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) {
    return { valid: false, error: "Common.datePicker.invalidDay" };
  }

  // Try to parse the complete date
  const parsedDate = parseManualDateEntry(dateString, locale);
  if (!parsedDate) {
    return { valid: false, error: "Common.datePicker.invalidDate" };
  }

  return { valid: true };
}

/**
 * Checks if a date is within the acceptable range (1900-2100)
 * @param date - The Date object to validate
 * @returns true if date is within range, false otherwise
 */
export function isDateInRange(date: Date): boolean {
  const year = date.getFullYear();
  return year >= 1900 && year <= 2100;
}

/**
 * Validation error message keys for i18n
 */
export const DateValidationErrors = {
  INVALID_FORMAT: "Common.datePicker.invalidFormat",
  INVALID_DATE: "Common.datePicker.invalidDate",
  DATE_OUT_OF_RANGE: "Common.datePicker.dateOutOfRange",
  INVALID_DAY: "Common.datePicker.invalidDay",
  INVALID_MONTH: "Common.datePicker.invalidMonth",
} as const;

/**
 * Zod schema for validating date strings in Portuguese format (dd/MM/yyyy)
 */
export const dateStringPtSchema = z
  .string()
  .trim()
  .min(1, { message: DateValidationErrors.INVALID_DATE })
  .regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, {
    message: DateValidationErrors.INVALID_FORMAT,
  })
  .refine(
    (value) => {
      const result = validateDateString(value, "pt");
      return result.valid;
    },
    {
      message: DateValidationErrors.INVALID_DATE,
    }
  );

/**
 * Zod schema for validating date strings in English format (MM/dd/yyyy)
 */
export const dateStringEnSchema = z
  .string()
  .trim()
  .min(1, { message: DateValidationErrors.INVALID_DATE })
  .regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, {
    message: DateValidationErrors.INVALID_FORMAT,
  })
  .refine(
    (value) => {
      const result = validateDateString(value, "en");
      return result.valid;
    },
    {
      message: DateValidationErrors.INVALID_DATE,
    }
  );

/**
 * Creates a locale-aware Zod schema for date string validation
 * @param locale - The locale string ('pt' or 'en')
 * @returns A Zod schema configured for the specified locale
 */
export function createDateStringSchema(locale: string) {
  return locale === "pt" ? dateStringPtSchema : dateStringEnSchema;
}

/**
 * Zod schema for optional date strings
 */
export const optionalDateStringSchema = (locale: string) =>
  z.union([
    createDateStringSchema(locale),
    z.literal(""),
    z.undefined(),
  ]);
