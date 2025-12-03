import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names, resolving any conflicts.
 *
 * @param inputs - An array of class names to merge.
 * @returns A string of merged and optimized class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
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
 * Parses a date string (ISO format or locale format) into a Date object
 * @param value - The date string to parse (ISO format yyyy-MM-dd or locale format)
 * @returns A Date object if parsing succeeds, undefined otherwise
 */
export function parseDateFromInput(value: string | undefined): Date | undefined {
  if (!value) return undefined;

  // Try parsing as ISO format (yyyy-MM-dd)
  const isoDate = new Date(value);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  return undefined;
}

/**
 * Gets the date placeholder text based on locale
 * @param locale - The locale string ('pt' or 'en')
 * @returns The placeholder text for the date input
 */
export function getDatePlaceholder(locale: string): string {
  return locale === "pt" ? "dd/mm/aaaa" : "mm/dd/yyyy";
}

/**
 * Formats a Date object for display in locale-specific format
 * @param date - The Date object to format
 * @param locale - The locale string ('pt' or 'en')
 * @returns The formatted date string (dd/MM/yyyy for pt, MM/dd/yyyy for en)
 */
export function formatDateForDisplay(
  date: Date | undefined,
  locale: string
): string | undefined {
  if (!date || isNaN(date.getTime())) return undefined;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  if (locale === "pt") {
    return `${day}/${month}/${year}`;
  }
  return `${month}/${day}/${year}`;
}

/**
 * Formats a Date object for storage in ISO format (yyyy-MM-dd)
 * @param date - The Date object to format
 * @returns The ISO formatted date string, or undefined if date is invalid
 */
export function formatDateForStorage(date: Date | undefined): string | undefined {
  if (!date || isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
