"use client"

import * as React from "react"
import { flexRender } from "@tanstack/react-table"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { useDataGrid } from "./data-grid"
import { Checkbox } from "./checkbox"
import { Skeleton } from "./skeleton"

/**
 * DataGridTable - Main table component that renders headers, body, and footer
 */
export function DataGridTable() {
  const {
    table,
    recordCount,
    onRowClick,
    isLoading,
    loadingMode,
    emptyMessage,
    tableLayout,
    tableClassNames,
  } = useDataGrid()

  const rows = table.getRowModel().rows

  return (
    <div className="relative w-full overflow-auto">
      <table
        className={cn(
          "w-full caption-bottom text-sm",
          tableLayout.width === "fixed" && "table-fixed",
          tableLayout.width === "auto" && "table-auto",
          tableClassNames.base
        )}
      >
        {/* Header */}
        <thead
          className={cn(
            tableLayout.headerBackground && "bg-muted/50",
            tableLayout.headerBorder && "border-b",
            tableLayout.headerSticky && tableClassNames.headerSticky,
            tableClassNames.header
          )}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className={cn(
                "border-b transition-colors hover:bg-muted/50",
                tableClassNames.headerRow
              )}
            >
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as any
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      width: header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                    className={cn(
                      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                      tableLayout.dense && "h-8 px-1.5",
                      tableLayout.cellBorder && "border-r last:border-r-0",
                      meta?.headerClassName,
                      tableClassNames.edgeCell
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>

        {/* Body */}
        <tbody className={cn(tableClassNames.body)}>
          {isLoading && loadingMode === "skeleton" ? (
            // Skeleton loading state
            Array.from({ length: table.getState().pagination.pageSize || 10 }).map(
              (_, index) => (
                <tr key={`skeleton-${index}`} className="border-b">
                  {table.getAllColumns().map((column) => {
                    const meta = column.columnDef.meta as any
                    return (
                      <td
                        key={column.id}
                        className={cn(
                          "p-2 align-middle",
                          tableLayout.dense && "p-1.5",
                          tableLayout.cellBorder && "border-r last:border-r-0"
                        )}
                      >
                        {meta?.skeleton || <Skeleton className="h-5 w-full" />}
                      </td>
                    )
                  })}
                </tr>
              )
            )
          ) : rows.length === 0 ? (
            // Empty state
            <tr>
              <td
                colSpan={table.getAllColumns().length}
                className="h-24 text-center"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            // Data rows
            rows.map((row) => {
              const meta = row.original as any
              return (
                <React.Fragment key={row.id}>
                  <tr
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={cn(
                      "border-b transition-colors",
                      onRowClick && "cursor-pointer",
                      tableLayout.stripped && "even:bg-muted/50",
                      tableLayout.rowRounded && "rounded-lg",
                      !tableLayout.rowBorder && "border-b-0",
                      "hover:bg-muted/50 data-[state=selected]:bg-muted",
                      tableClassNames.bodyRow
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const columnMeta = cell.column.columnDef.meta as any
                      return (
                        <td
                          key={cell.id}
                          style={{
                            width:
                              cell.column.getSize() !== 150
                                ? cell.column.getSize()
                                : undefined,
                          }}
                          className={cn(
                            "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                            tableLayout.dense && "p-1.5",
                            tableLayout.cellBorder && "border-r last:border-r-0",
                            columnMeta?.cellClassName,
                            tableClassNames.edgeCell
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Expanded row content */}
                  {row.getIsExpanded() && (
                    <tr>
                      <td
                        colSpan={row.getVisibleCells().length}
                        className="p-0"
                      >
                        {/* Find expanded content from column meta */}
                        {row
                          .getAllCells()
                          .find((cell) => {
                            const meta = cell.column.columnDef.meta as any
                            return meta?.expandedContent
                          })
                          ?.column.columnDef.meta?.expandedContent?.(row.original)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })
          )}
        </tbody>

        {/* Footer */}
        {table.getFooterGroups().some((group) => group.headers.length > 0) && (
          <tfoot className={cn("border-t bg-muted/50", tableClassNames.footer)}>
            {table.getFooterGroups().map((footerGroup) => (
              <tr key={footerGroup.id}>
                {footerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      "p-2 text-left align-middle font-medium",
                      tableLayout.dense && "p-1.5"
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.footer,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </div>
  )
}

/**
 * DataGridTableRowSelectAll - Checkbox for selecting all rows
 */
export function DataGridTableRowSelectAll() {
  const { table } = useDataGrid()

  return (
    <Checkbox
      checked={
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && "indeterminate")
      }
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
      className="translate-y-[2px]"
    />
  )
}

/**
 * DataGridTableRowSelect - Checkbox for selecting individual row
 */
export function DataGridTableRowSelect<TData>({
  row,
}: {
  row: { id: string; getIsSelected: () => boolean; toggleSelected: (value?: boolean) => void }
}) {
  return (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
      className="translate-y-[2px]"
    />
  )
}
