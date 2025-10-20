"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDataGrid } from "./data-grid"
import { Skeleton } from "./skeleton"

/**
 * DataGridPagination component props
 */
export interface DataGridPaginationProps {
  /** Available page sizes */
  sizes?: number[]
  /** Label for page size selector */
  sizesLabel?: string
  /** Description for page size */
  sizesDescription?: string
  /** Custom info text for page size */
  sizesInfo?: string
  /** Loading skeleton for page size selector */
  sizesSkeleton?: React.ReactNode
  /** Enable more pages display */
  more?: boolean
  /** Limit for pagination buttons */
  moreLimit?: number
  /** Pagination info format */
  info?: string
  /** Loading skeleton for info */
  infoSkeleton?: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Label for rows per page */
  rowsPerPageLabel?: string
  /** Aria label for previous button */
  previousPageLabel?: string
  /** Aria label for next button */
  nextPageLabel?: string
  /** Text for pagination ellipsis */
  ellipsisText?: string
}

/**
 * DataGridPagination - Provides pagination controls for the data grid
 *
 * @example
 * ```tsx
 * <DataGridPagination
 *   sizes={[5, 10, 25, 50, 100]}
 *   rowsPerPageLabel="Rows per page"
 * />
 * ```
 */
export function DataGridPagination({
  sizes = [5, 10, 25, 50, 100],
  sizesLabel = "Show",
  sizesDescription = "per page",
  sizesInfo,
  sizesSkeleton,
  more = false,
  moreLimit = 5,
  info = "{from} - {to} of {count}",
  infoSkeleton,
  className,
  rowsPerPageLabel = "Rows per page",
  previousPageLabel = "Go to previous page",
  nextPageLabel = "Go to next page",
  ellipsisText = "...",
}: DataGridPaginationProps) {
  const { table, recordCount, isLoading } = useDataGrid()

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const pageCount = table.getPageCount()

  // Calculate from/to for display
  const from = pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, recordCount ?? 0)

  // Format info text
  const formattedInfo = info
    .replace("{from}", from.toString())
    .replace("{to}", to.toString())
    .replace("{count}", (recordCount ?? 0).toString())

  // Generate page numbers for "more" mode
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const halfLimit = Math.floor(moreLimit / 2)

    if (pageCount <= moreLimit) {
      // Show all pages if less than limit
      for (let i = 0; i < pageCount; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(0)

      // Calculate start and end of visible page range
      let start = Math.max(1, pageIndex - halfLimit)
      let end = Math.min(pageCount - 2, pageIndex + halfLimit)

      // Adjust if we're near the beginning or end
      if (pageIndex < halfLimit) {
        end = moreLimit - 2
      } else if (pageIndex > pageCount - halfLimit - 1) {
        start = pageCount - moreLimit + 1
      }

      // Add ellipsis before if needed
      if (start > 1) {
        pages.push("ellipsis-start")
      }

      // Add visible pages
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      // Add ellipsis after if needed
      if (end < pageCount - 2) {
        pages.push("ellipsis-end")
      }

      // Always show last page
      pages.push(pageCount - 1)
    }

    return pages
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-2 py-2 flex-wrap",
        className
      )}
    >
      {/* Page size selector */}
      <div className="flex items-center space-x-2 shrink-0">
        {isLoading && sizesSkeleton ? (
          sizesSkeleton
        ) : (
          <>
            <p className="text-sm font-medium hidden sm:inline">{rowsPerPageLabel}</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {sizes.map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs font-medium whitespace-nowrap">/ page</p>
          </>
        )}
      </div>

      {/* Info and pagination controls */}
      <div className="flex items-center gap-2 sm:gap-6 lg:gap-8">
        {/* Info */}
        <div className="flex items-center justify-center text-xs sm:text-sm font-medium whitespace-nowrap">
          {isLoading && infoSkeleton ? (
            infoSkeleton
          ) : (
            <span>{formattedInfo}</span>
          )}
        </div>

        {/* Pagination buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* First page */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label={previousPageLabel}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers (if more mode enabled) */}
          {more && (
            <div className="flex items-center space-x-1">
              {getPageNumbers().map((page, index) => {
                if (typeof page === "string") {
                  return (
                    <span
                      key={`${page}-${index}`}
                      className="flex h-8 w-8 items-center justify-center text-sm"
                    >
                      {ellipsisText}
                    </span>
                  )
                }

                return (
                  <Button
                    key={page}
                    variant={pageIndex === page ? "default" : "outline"}
                    className="h-8 w-8 p-0"
                    onClick={() => table.setPageIndex(page)}
                  >
                    {page + 1}
                  </Button>
                )
              })}
            </div>
          )}

          {/* Next page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label={nextPageLabel}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
