import { normalizeString } from "./utils"

export interface FuzzyMatch {
  score: number
  matches: number[]
}

/**
 * Performs fuzzy search matching on a string with accent-insensitive comparison.
 * Supports searching for "João" using "joao" and vice versa.
 *
 * @param text The text to search in
 * @param searchTerm The search term to find
 * @returns FuzzyMatch object with score and character positions, or null if no match
 */
export function fuzzyMatch(text: string, searchTerm: string): FuzzyMatch | null {
  if (!searchTerm || searchTerm.length === 0) {
    return null
  }

  // Normalize both text and search term for accent-insensitive comparison
  const textNormalized = normalizeString(text)
  const searchNormalized = normalizeString(searchTerm)

  let searchIndex = 0
  let textIndex = 0
  const matches: number[] = []
  let score = 0

  while (textIndex < textNormalized.length && searchIndex < searchNormalized.length) {
    if (textNormalized[textIndex] === searchNormalized[searchIndex]) {
      matches.push(textIndex)
      score += (1 / (textIndex + 1)) * 100 // Earlier matches score higher
      searchIndex++
    }
    textIndex++
  }

  // If we didn't match all characters, return null
  if (searchIndex < searchNormalized.length) {
    return null
  }

  return { score, matches }
}

/**
 * Filters data using accent-insensitive fuzzy search
 * @param rows The rows to filter
 * @param columnId The column ID to search in
 * @param filterValue The search term (accent-insensitive)
 * @returns Boolean indicating if the row matches
 */
export function fuzzyFilter<TData>(
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: string
): boolean {
  const value = row.getValue(columnId)
  if (!value || typeof value !== "string") return false
  return fuzzyMatch(value, filterValue) !== null
}

/**
 * Global fuzzy filter function for TanStack Table with accent-insensitive search.
 * Searches across all string columns in a row.
 * Supports searching "joao" to find "João" and vice versa.
 */
export function globalFuzzyFilter<TData>(
  row: { getValue: (columnId: string) => unknown; getAllCells: () => Array<{ column: { id: string }; getValue: () => unknown }> },
  columnId: string,
  filterValue: string
): boolean {
  if (!filterValue) return true

  // Search across all cells in the row
  const cells = row.getAllCells()
  for (const cell of cells) {
    const value = cell.getValue()
    if (value && typeof value === "string") {
      if (fuzzyMatch(value, filterValue) !== null) {
        return true
      }
    }
  }

  return false
}
