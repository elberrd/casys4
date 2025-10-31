import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
