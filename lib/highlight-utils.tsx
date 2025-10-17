import { fuzzyMatch } from "./fuzzy-search"

/**
 * Highlights matching characters in text based on fuzzy search
 * @param text The text to highlight
 * @param searchTerm The search term
 * @param highlightClassName The CSS class to apply to highlighted text
 * @returns JSX with highlighted text
 */
export function highlightText(
  text: string,
  searchTerm: string,
  highlightClassName: string = "bg-yellow-200 dark:bg-yellow-900"
): React.ReactNode {
  if (!searchTerm || searchTerm.length === 0) {
    return text
  }

  const match = fuzzyMatch(text, searchTerm)

  if (!match) {
    return text
  }

  const result: React.ReactNode[] = []
  let lastIndex = 0

  match.matches.forEach((matchIndex, i) => {
    // Add text before the match
    if (matchIndex > lastIndex) {
      result.push(
        <span key={`text-${i}`}>{text.substring(lastIndex, matchIndex)}</span>
      )
    }

    // Add highlighted character
    result.push(
      <mark
        key={`highlight-${i}`}
        className={highlightClassName}
      >
        {text[matchIndex]}
      </mark>
    )

    lastIndex = matchIndex + 1
  })

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(
      <span key="text-end">{text.substring(lastIndex)}</span>
    )
  }

  return <>{result}</>
}

/**
 * Check if text matches the search term
 * @param text The text to check
 * @param searchTerm The search term
 * @returns Boolean indicating if there's a match
 */
export function hasMatch(text: string, searchTerm: string): boolean {
  if (!searchTerm || searchTerm.length === 0) {
    return false
  }
  return fuzzyMatch(text, searchTerm) !== null
}
