"use client"

import * as React from "react"
import { Table as TanstackTable } from "@tanstack/react-table"

import { cn } from "@/lib/utils"

/**
 * Data Grid table layout configuration
 */
export interface DataGridTableLayout {
  /** Compact row spacing for displaying more data */
  dense?: boolean
  /** Show borders around cells */
  cellBorder?: boolean
  /** Show borders between rows */
  rowBorder?: boolean
  /** Rounded corners on rows */
  rowRounded?: boolean
  /** Alternating row colors for better readability */
  stripped?: boolean
  /** Background color for header */
  headerBackground?: boolean
  /** Border for header */
  headerBorder?: boolean
  /** Sticky header on scroll */
  headerSticky?: boolean
  /** Table width mode */
  width?: "auto" | "fixed"
  /** Enable column visibility controls */
  columnsVisibility?: boolean
  /** Enable column resizing */
  columnsResizable?: boolean
  /** Enable column pinning */
  columnsPinnable?: boolean
  /** Enable column reordering */
  columnsMovable?: boolean
  /** Enable drag & drop for columns */
  columnsDraggable?: boolean
  /** Enable drag & drop for rows */
  rowsDraggable?: boolean
}

/**
 * Custom class names for data grid table elements
 */
export interface DataGridTableClassNames {
  base?: string
  header?: string
  headerRow?: string
  headerSticky?: string
  body?: string
  bodyRow?: string
  footer?: string
  edgeCell?: string
}

/**
 * Column metadata for custom rendering and behavior
 */
export interface DataGridColumnMeta<TData = unknown> {
  /** Custom header title */
  headerTitle?: string
  /** Custom header CSS classes */
  headerClassName?: string
  /** Custom cell CSS classes */
  cellClassName?: string
  /** Custom skeleton for loading state */
  skeleton?: React.ReactNode
  /** Content to show when row is expanded */
  expandedContent?: (row: TData) => React.ReactNode
}

/**
 * Data Grid component props
 */
export interface DataGridProps<TData> {
  /** TanStack Table instance */
  table: TanstackTable<TData>
  /** Total number of records */
  recordCount: number
  /** Child components */
  children?: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Callback when a row is clicked */
  onRowClick?: (row: TData) => void
  /** Loading state */
  isLoading?: boolean
  /** Loading display mode */
  loadingMode?: "skeleton" | "spinner"
  /** Message shown during loading */
  loadingMessage?: React.ReactNode | string
  /** Message shown when no data */
  emptyMessage?: React.ReactNode | string
  /** Table layout configuration */
  tableLayout?: DataGridTableLayout
  /** Custom class names for table elements */
  tableClassNames?: DataGridTableClassNames
}

/**
 * Data Grid Context
 */
interface DataGridContextValue<TData> {
  table: TanstackTable<TData>
  recordCount: number
  onRowClick?: (row: TData) => void
  isLoading: boolean
  loadingMode: "skeleton" | "spinner"
  loadingMessage: React.ReactNode | string
  emptyMessage: React.ReactNode | string
  tableLayout: Required<DataGridTableLayout>
  tableClassNames: Required<DataGridTableClassNames>
  searchTerm: string
}

const DataGridContext = React.createContext<DataGridContextValue<any> | null>(
  null
)

/**
 * Hook to access Data Grid context
 */
export function useDataGrid<TData = unknown>() {
  const context = React.useContext(DataGridContext) as DataGridContextValue<TData> | null
  if (!context) {
    throw new Error("useDataGrid must be used within a DataGrid component")
  }
  return context
}

/**
 * Default table layout configuration
 */
const defaultTableLayout: Required<DataGridTableLayout> = {
  dense: false,
  cellBorder: false,
  rowBorder: true,
  rowRounded: false,
  stripped: false,
  headerBackground: true,
  headerBorder: true,
  headerSticky: false,
  width: "fixed",
  columnsVisibility: false,
  columnsResizable: false,
  columnsPinnable: false,
  columnsMovable: false,
  columnsDraggable: false,
  rowsDraggable: false,
}

/**
 * Default table class names
 */
const defaultTableClassNames: Required<DataGridTableClassNames> = {
  base: "",
  header: "",
  headerRow: "",
  headerSticky: "sticky top-0 z-10 bg-background/90 backdrop-blur-xs",
  body: "",
  bodyRow: "",
  footer: "",
  edgeCell: "",
}

/**
 * DataGrid component - Main wrapper that provides context for the entire data grid
 *
 * @example
 * ```tsx
 * <DataGrid table={table} recordCount={data.length}>
 *   <DataGridContainer>
 *     <ScrollArea>
 *       <DataGridTable />
 *       <ScrollBar orientation="horizontal" />
 *     </ScrollArea>
 *   </DataGridContainer>
 *   <DataGridPagination />
 * </DataGrid>
 * ```
 */
export function DataGrid<TData>({
  table,
  recordCount,
  children,
  className,
  onRowClick,
  isLoading = false,
  loadingMode = "skeleton",
  loadingMessage = "Loading...",
  emptyMessage = "No data available",
  tableLayout = {},
  tableClassNames = {},
}: DataGridProps<TData>) {
  const mergedTableLayout = React.useMemo(
    () => ({ ...defaultTableLayout, ...tableLayout }),
    [tableLayout]
  )

  const mergedTableClassNames = React.useMemo(
    () => ({ ...defaultTableClassNames, ...tableClassNames }),
    [tableClassNames]
  )

  const contextValue: DataGridContextValue<TData> = React.useMemo(
    () => ({
      table,
      recordCount,
      onRowClick,
      isLoading,
      loadingMode,
      loadingMessage,
      emptyMessage,
      tableLayout: mergedTableLayout,
      tableClassNames: mergedTableClassNames,
      searchTerm: (table?.getState().globalFilter as string) || "",
    }),
    [
      table,
      recordCount,
      onRowClick,
      isLoading,
      loadingMode,
      loadingMessage,
      emptyMessage,
      mergedTableLayout,
      mergedTableClassNames,
      table?.getState().globalFilter,
    ]
  )

  return (
    <DataGridContext.Provider value={contextValue}>
      <div className={cn("w-full", className)}>{children}</div>
    </DataGridContext.Provider>
  )
}

/**
 * DataGridContainer - Wrapper component for the table
 */
export function DataGridContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-background w-full overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  )
}
