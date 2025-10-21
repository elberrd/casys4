import { ColumnDef } from "@tanstack/react-table"
import { DataGridTableRowSelect, DataGridTableRowSelectAll } from "@/components/ui/data-grid-table"

/**
 * Constants for column width calculation
 */
const AVERAGE_CHAR_WIDTH = 9 // Average character width in pixels for typical UI fonts
const COLUMN_PADDING = 32 // Total horizontal padding (16px * 2)
const SORT_ICON_SPACE = 24 // Space for sort icon in sortable columns
const MIN_COLUMN_WIDTH = 100 // Minimum column width in pixels
const MAX_COLUMN_WIDTH = 400 // Maximum column width in pixels

/**
 * Calculates the minimum width for a table column based on header text length
 *
 * This function ensures that column headers never overflow by calculating an appropriate
 * minimum width based on the text content, padding, and any additional UI elements like sort icons.
 *
 * @param text - The column header text
 * @param hasIcon - Whether the column has an icon (e.g., sort indicator)
 * @param hasSorting - Whether the column has sorting enabled (adds space for sort dropdown)
 * @returns The calculated minimum width in pixels (constrained between MIN and MAX values)
 *
 * @example
 * ```tsx
 * // For a simple column header
 * const width = calculateMinColumnWidth("Name"); // ~85px
 *
 * // For a sortable column header
 * const width = calculateMinColumnWidth("Customer Name", false, true); // ~169px
 *
 * // For a column with an icon
 * const width = calculateMinColumnWidth("Status", true); // ~109px
 * ```
 */
export function calculateMinColumnWidth(
  text: string,
  hasIcon: boolean = false,
  hasSorting: boolean = true
): number {
  // Handle empty or null text
  if (!text || text.trim().length === 0) {
    return MIN_COLUMN_WIDTH
  }

  // Calculate base width from text length
  const textWidth = text.length * AVERAGE_CHAR_WIDTH

  // Add padding
  let totalWidth = textWidth + COLUMN_PADDING

  // Add space for icon if present
  if (hasIcon) {
    totalWidth += SORT_ICON_SPACE
  }

  // Add space for sorting dropdown if enabled
  if (hasSorting) {
    totalWidth += SORT_ICON_SPACE
  }

  // Constrain to min/max bounds
  return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, totalWidth))
}

/**
 * Creates a default select column for data grid tables with multi-select functionality
 * @returns ColumnDef with checkbox select-all header and row select cells
 */
export function createSelectColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: () => <DataGridTableRowSelectAll />,
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    size: 40,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
  }
}
