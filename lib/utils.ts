import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parse } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a string for accent-insensitive and case-insensitive comparison.
 * Removes all diacritical marks (accents) and converts to lowercase.
 *
 * This function is useful for search functionality where "João" should match "joao",
 * "São Paulo" should match "sao paulo", etc.
 *
 * @param str - The string to normalize
 * @returns The normalized string (lowercase, no accents)
 *
 * @example
 * normalizeString("João") // Returns "joao"
 * normalizeString("São Paulo") // Returns "sao paulo"
 * normalizeString("José María") // Returns "jose maria"
 * normalizeString("Açúcar") // Returns "acucar"
 * normalizeString("") // Returns ""
 */
export function normalizeString(str: string): string {
  if (!str) return "";

  return str
    .normalize("NFD") // Decompose characters into base + diacritical marks
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
    .toLowerCase(); // Convert to lowercase
}

/**
 * Returns the date format string for the given locale.
 *
 * @param locale - The locale string ('pt' or 'en')
 * @returns The date format string (e.g., "dd/MM/yyyy" for pt, "MM/dd/yyyy" for en)
 *
 * @example
 * getLocaleDateFormat("pt") // Returns "dd/MM/yyyy"
 * getLocaleDateFormat("en") // Returns "MM/dd/yyyy"
 */
export function getLocaleDateFormat(locale: string): string {
  return locale === "pt" ? "dd/MM/yyyy" : "MM/dd/yyyy";
}

/**
 * Returns the date placeholder string for the given locale.
 *
 * @param locale - The locale string ('pt' or 'en')
 * @returns The placeholder string (e.g., "dd/mm/aaaa" for pt, "mm/dd/yyyy" for en)
 *
 * @example
 * getDatePlaceholder("pt") // Returns "dd/mm/aaaa"
 * getDatePlaceholder("en") // Returns "mm/dd/yyyy"
 */
export function getDatePlaceholder(locale: string): string {
  return locale === "pt" ? "dd/mm/aaaa" : "mm/dd/yyyy";
}

/**
 * Formats a Date object for display using the locale-specific format.
 *
 * @param date - The Date object to format (or undefined)
 * @param locale - The locale string ('pt' or 'en')
 * @returns The formatted date string or undefined if date is not provided
 *
 * @example
 * formatDateForDisplay(new Date(2024, 11, 25), "pt") // Returns "25/12/2024"
 * formatDateForDisplay(new Date(2024, 11, 25), "en") // Returns "12/25/2024"
 * formatDateForDisplay(undefined, "pt") // Returns undefined
 */
export function formatDateForDisplay(
  date: Date | undefined,
  locale: string
): string | undefined {
  if (!date) return undefined;

  const dateLocale = locale === "pt" ? ptBR : enUS;
  const dateFormat = getLocaleDateFormat(locale);

  return format(date, dateFormat, { locale: dateLocale });
}

/**
 * Parses a date string in YYYY-MM-DD format (ISO format from backend) into a Date object.
 * Uses local date parsing to avoid timezone offset issues.
 *
 * @param dateString - The date string in YYYY-MM-DD format
 * @returns The Date object or undefined if parsing fails
 *
 * @example
 * parseDateFromInput("2024-12-25") // Returns Date object for Dec 25, 2024
 * parseDateFromInput("") // Returns undefined
 * parseDateFromInput("invalid") // Returns undefined
 */
export function parseDateFromInput(dateString: string): Date | undefined {
  if (!dateString) return undefined;

  try {
    // Parse as local date to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);

    // Validate the parsed values
    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      return undefined;
    }

    const date = new Date(year, month - 1, day);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return undefined;
    }

    return date;
  } catch {
    return undefined;
  }
}

/**
 * Formats a Date object to YYYY-MM-DD format (ISO format for backend storage).
 *
 * @param date - The Date object to format
 * @returns The date string in YYYY-MM-DD format or undefined if date is not provided
 *
 * @example
 * formatDateForStorage(new Date(2024, 11, 25)) // Returns "2024-12-25"
 * formatDateForStorage(undefined) // Returns undefined
 */
export function formatDateForStorage(date: Date | undefined): string | undefined {
  if (!date) return undefined;

  return format(date, "yyyy-MM-dd");
}
