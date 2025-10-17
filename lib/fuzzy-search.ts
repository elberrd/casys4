export interface FuzzyMatch {
  score: number
  matches: number[]
}

/**
 * Performs fuzzy search matching on a string
 * @param text The text to search in
 * @param searchTerm The search term to find
 * @returns FuzzyMatch object with score and character positions, or null if no match
 */
export function fuzzyMatch(text: string, searchTerm: string): FuzzyMatch | null {
  if (!searchTerm || searchTerm.length === 0) {
    return null
  }

  const textLower = text.toLowerCase()
  const searchLower = searchTerm.toLowerCase()

  let searchIndex = 0
  let textIndex = 0
  const matches: number[] = []
  let score = 0

  while (textIndex < textLower.length && searchIndex < searchLower.length) {
    if (textLower[textIndex] === searchLower[searchIndex]) {
      matches.push(textIndex)
      score += (1 / (textIndex + 1)) * 100 // Earlier matches score higher
      searchIndex++
    }
    textIndex++
  }

  // If we didn't match all characters, return null
  if (searchIndex < searchLower.length) {
    return null
  }

  return { score, matches }
}

/**
 * Filters data using fuzzy search
 * @param rows The rows to filter
 * @param columnId The column ID to search in
 * @param filterValue The search term
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
 * Global fuzzy filter function for TanStack Table
 * Searches across all string columns in a row
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
