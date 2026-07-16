"use client"

import * as React from "react"
import { Table, VisibilityState } from "@tanstack/react-table"
import { RotateCcw, Search, Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { fuzzyMatch } from "@/lib/fuzzy-search"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * DataGridColumnVisibility component props
 */
export interface DataGridColumnVisibilityProps<TData> {
  /** TanStack Table instance */
  table: Table<TData>
  /** Custom trigger element */
  trigger?: React.ReactNode
  /** Label for the dropdown */
  label?: string
  /** Label for show all option */
  showAllLabel?: string
  /** Label for hide all option */
  hideAllLabel?: string
  /** Label for reset option */
  resetLabel?: string
  /** Columns to exclude from visibility control */
  excludeColumns?: string[]
  /** Map of column IDs to display labels */
  columnLabels?: Record<string, string>
  /** Default column visibility state to reset to */
  defaultColumnVisibility?: VisibilityState
  /** Callback when visibility is reset */
  onReset?: () => void
  /** Whether to show a fuzzy-search input for the column list */
  searchable?: boolean
  /** Placeholder for the column search input */
  searchPlaceholder?: string
  /** Empty state shown when no columns match the search */
  noResultsLabel?: string
}

interface ColumnSearchMatch {
  score: number
  matches: Set<number>
}

function getColumnSearchMatch(
  label: string,
  searchQuery: string
): ColumnSearchMatch | null {
  const terms = searchQuery.trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return { score: 0, matches: new Set() }

  const matches = new Set<number>()
  let score = 0

  for (const term of terms) {
    const match = fuzzyMatch(label, term)
    if (!match) return null

    score += match.score
    match.matches.forEach((index) => matches.add(index))
  }

  return { score, matches }
}

function HighlightedColumnLabel({
  label,
  match,
}: {
  label: string
  match: ColumnSearchMatch | null
}) {
  if (!match || match.matches.size === 0) return label

  return (
    <>
      {Array.from(label).map((character, index) =>
        match.matches.has(index) ? (
          <mark
            key={`${character}-${index}`}
            className="rounded-[2px] bg-primary/20 text-foreground"
          >
            {character}
          </mark>
        ) : (
          <React.Fragment key={`${character}-${index}`}>
            {character}
          </React.Fragment>
        )
      )}
    </>
  )
}

/**
 * DataGridColumnVisibility - Controls for toggling column visibility
 *
 * @example
 * ```tsx
 * <DataGridColumnVisibility
 *   table={table}
 *   trigger={<Button variant="outline">Columns</Button>}
 * />
 * ```
 */
export function DataGridColumnVisibility<TData>({
  table,
  trigger,
  label = "Toggle columns",
  showAllLabel = "Show all",
  hideAllLabel = "Hide all",
  resetLabel = "Reset",
  excludeColumns = ["select", "actions"],
  columnLabels = {},
  defaultColumnVisibility,
  onReset,
  searchable = false,
  searchPlaceholder = "Search columns...",
  noResultsLabel = "No columns found",
}: DataGridColumnVisibilityProps<TData>) {
  const [searchQuery, setSearchQuery] = React.useState("")

  // Get all columns that can be hidden
  const columns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== "undefined" &&
        column.getCanHide() &&
        !excludeColumns.includes(column.id)
    )

  // Check if all columns are visible
  const allVisible = columns.every((column) => column.getIsVisible())

  // Check if no columns are visible
  const noneVisible = columns.every((column) => !column.getIsVisible())

  // Check if current visibility matches default
  const isDefaultState = React.useMemo(() => {
    if (!defaultColumnVisibility) return true

    return columns.every((column) => {
      const defaultVisible = defaultColumnVisibility[column.id] ?? true
      return column.getIsVisible() === defaultVisible
    })
  }, [columns, defaultColumnVisibility])

  const handleShowAll = () => {
    table.setColumnVisibility((currentVisibility) => {
      const nextVisibility = { ...currentVisibility }
      columns.forEach((column) => {
        nextVisibility[column.id] = true
      })
      return nextVisibility
    })
  }

  const handleHideAll = () => {
    table.setColumnVisibility((currentVisibility) => {
      const nextVisibility = { ...currentVisibility }
      columns.forEach((column) => {
        nextVisibility[column.id] = false
      })
      return nextVisibility
    })
  }

  const handleReset = () => {
    if (onReset) {
      onReset()
    } else if (defaultColumnVisibility) {
      // Apply default visibility directly
      columns.forEach((column) => {
        const defaultVisible = defaultColumnVisibility[column.id] ?? true
        column.toggleVisibility(defaultVisible)
      })
    }
  }

  const searchableColumns = React.useMemo(() => {
    return columns
      .map((column) => {
        const title =
          columnLabels[column.id] ||
          (typeof column.columnDef.header === "string"
            ? column.columnDef.header
            : column.id)
        const match = getColumnSearchMatch(title, searchQuery)

        return { column, title, match }
      })
      .filter((item) => item.match !== null)
      .sort((a, b) => {
        if (!searchQuery.trim()) return 0
        return (b.match?.score ?? 0) - (a.match?.score ?? 0)
      })
  }, [columnLabels, columns, searchQuery])

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setSearchQuery("")
      }}
    >
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto hidden h-8 lg:flex"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            {label}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[260px]">
        <div className="flex items-center justify-between gap-2">
          <DropdownMenuLabel className="flex-1">{label}</DropdownMenuLabel>
          {(defaultColumnVisibility || onReset) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={handleReset}
                  disabled={isDefaultState && !onReset}
                  aria-label={resetLabel}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{resetLabel}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <DropdownMenuSeparator />

        {searchable && (
          <div className="relative p-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape") event.stopPropagation()
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-8 pl-8"
            />
          </div>
        )}

        {/* Show/Hide all options */}
        <div className="grid grid-cols-2 gap-1 p-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 justify-center px-2"
            onClick={handleShowAll}
            disabled={allVisible}
          >
            {showAllLabel}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 justify-center px-2"
            onClick={handleHideAll}
            disabled={noneVisible}
          >
            {hideAllLabel}
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* Individual column toggles */}
        <div className="max-h-72 overflow-y-auto">
          {searchableColumns.length > 0 ? (
            searchableColumns.map(({ column, title, match }) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                onSelect={(event) => event.preventDefault()}
              >
                <HighlightedColumnLabel label={title} match={match} />
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {noResultsLabel}
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
