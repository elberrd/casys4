import { z } from "zod";

/**
 * Generates a code/slug from a name string.
 * - Converts to uppercase
 * - Normalizes accented characters (e.g., e -> E, c -> C)
 * - Replaces spaces with underscores
 * - Removes special characters (keeps only A-Z, 0-9, _)
 * - Removes consecutive underscores
 * - Trims underscores from start/end
 */
export function generateCategoryCodeFromName(name: string): string {
  return name
    // Normalize unicode characters (NFD decomposes accented chars)
    .normalize("NFD")
    // Remove diacritical marks (accents)
    .replace(/[\u0300-\u036f]/g, "")
    // Convert to uppercase
    .toUpperCase()
    // Replace spaces and hyphens with underscores
    .replace(/[\s-]+/g, "_")
    // Remove any character that is not A-Z, 0-9, or underscore
    .replace(/[^A-Z0-9_]/g, "")
    // Replace multiple consecutive underscores with single underscore
    .replace(/_+/g, "_")
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, "");
}

export const documentCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50)
    .regex(
      /^[A-Z0-9_]+$/,
      "Code must contain only uppercase letters, numbers, and underscores"
    )
    .transform((val) => val.toUpperCase().replace(/\s+/g, "_")),
  description: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type DocumentCategoryFormData = z.infer<typeof documentCategorySchema>;
