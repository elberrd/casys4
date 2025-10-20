"use client"

import { fuzzyMatch } from "@/lib/fuzzy-search"
import { useDataGrid } from "./data-grid"

interface DataGridHighlightedCellProps {
  text: string
  searchTerm?: string
  className?: string
}

/**
 * Highlights matching characters in a table cell based on search term
 * Can be used with explicit searchTerm or will automatically use the global filter from context
 */
export function DataGridHighlightedCell({
  text,
  searchTerm: explicitSearchTerm,
  className,
}: DataGridHighlightedCellProps) {
  // Always call the hook unconditionally (required by React rules)
  const context = useDataGrid()
  // Use explicit search term if provided, otherwise get from context
  const searchTerm = explicitSearchTerm ?? context?.searchTerm ?? ""
  // If no search term or no match, render plain text
  if (!searchTerm || searchTerm.length === 0) {
    return <span className={className}>{text}</span>
  }

  const match = fuzzyMatch(text, searchTerm)

  if (!match) {
    return <span className={className}>{text}</span>
  }

  // Build highlighted text with mark elements
  const segments: React.ReactNode[] = []
  let lastIndex = 0

  match.matches.forEach((matchIndex, i) => {
    // Add text before the match
    if (matchIndex > lastIndex) {
      segments.push(
        <span key={`text-${i}`}>{text.substring(lastIndex, matchIndex)}</span>
      )
    }

    // Add highlighted character
    segments.push(
      <mark
        key={`mark-${i}`}
        className="bg-yellow-200 dark:bg-yellow-900/50 font-medium"
      >
        {text[matchIndex]}
      </mark>
    )

    lastIndex = matchIndex + 1
  })

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push(
      <span key="text-end">{text.substring(lastIndex)}</span>
    )
  }

  return <span className={className}>{segments}</span>
}
