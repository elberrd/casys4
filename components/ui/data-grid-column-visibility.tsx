"use client"

import * as React from "react"
import { Table, VisibilityState } from "@tanstack/react-table"
import { Settings2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
}: DataGridColumnVisibilityProps<TData>) {
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
    columns.forEach((column) => column.toggleVisibility(true))
  }

  const handleHideAll = () => {
    columns.forEach((column) => column.toggleVisibility(false))
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

  return (
    <DropdownMenu>
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
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Show/Hide all options */}
        <div className="space-y-1 p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 px-2"
            onClick={handleShowAll}
            disabled={allVisible}
          >
            {showAllLabel}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 px-2"
            onClick={handleHideAll}
            disabled={noneVisible}
          >
            {hideAllLabel}
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* Individual column toggles */}
        {columns.map((column) => {
          // Priority: columnLabels prop > string header > column id
          const title =
            columnLabels[column.id] ||
            (typeof column.columnDef.header === "string"
              ? column.columnDef.header
              : column.id)

          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
              onSelect={(e) => e.preventDefault()}
            >
              {title}
            </DropdownMenuCheckboxItem>
          )
        })}

        {/* Reset button */}
        {(defaultColumnVisibility || onReset) && (
          <>
            <DropdownMenuSeparator />
            <div className="p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-2 gap-2"
                onClick={handleReset}
                disabled={isDefaultState && !onReset}
              >
                <RotateCcw className="h-4 w-4" />
                {resetLabel}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
