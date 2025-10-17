import { ColumnDef } from "@tanstack/react-table"
import { DataGridTableRowSelect, DataGridTableRowSelectAll } from "@/components/ui/data-grid-table"

/**
 * Creates a default select column for data grid tables with multi-select functionality
 * @returns ColumnDef with checkbox select-all header and row select cells
 */
export function createSelectColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => <DataGridTableRowSelectAll table={table} />,
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    size: 40,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
  }
}
