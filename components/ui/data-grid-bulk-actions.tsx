"use client"

import * as React from "react"
import { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"

/**
 * Configuration for bulk delete confirmation dialog
 *
 * @example
 * ```tsx
 * {
 *   label: "Delete Selected",
 *   icon: <Trash2 />,
 *   variant: "destructive",
 *   confirmDelete: {
 *     entityName: "cities",
 *     onConfirm: async (items) => {
 *       await Promise.all(items.map(item => deleteCity(item._id)))
 *     }
 *   }
 * }
 * ```
 */
export interface BulkDeleteConfirmation<TData> {
  /**
   * The name of the entity type being deleted (e.g., "cities", "people")
   * Used in the confirmation dialog description
   */
  entityName: string

  /**
   * Async callback that performs the bulk delete operation
   * Receives the array of selected items
   * Should throw an error if the operation fails
   */
  onConfirm: (items: TData[]) => Promise<void>
}

/**
 * Bulk action configuration for data grid tables
 */
export interface BulkAction<TData> {
  /**
   * The label text displayed on the action button
   */
  label: string

  /**
   * Optional icon to display before the label
   */
  icon?: React.ReactNode

  /**
   * Callback when the action button is clicked
   * Receives the array of selected row data
   * Not used if confirmDelete is provided
   */
  onClick: (selectedRows: TData[]) => void | Promise<void>

  /**
   * Visual variant for the action button
   * "destructive" should be used for delete actions
   */
  variant?: "default" | "destructive" | "outline" | "secondary"

  /**
   * Optional bulk delete confirmation configuration
   * When provided, clicking the action will show a confirmation dialog
   * instead of immediately calling onClick
   *
   * @example
   * ```tsx
   * confirmDelete: {
   *   entityName: "cities",
   *   onConfirm: async (items) => {
   *     await bulkDeleteCities(items.map(item => item._id))
   *   }
   * }
   * ```
   */
  confirmDelete?: BulkDeleteConfirmation<TData>
}

interface DataGridBulkActionsProps<TData> {
  /**
   * The table instance from TanStack Table
   */
  table: Table<TData>

  /**
   * Array of bulk actions to display
   */
  actions: BulkAction<TData>[]

  /**
   * Optional CSS class name for the container
   */
  className?: string
}

/**
 * DataGridBulkActions - Action bar for bulk operations in data grids
 *
 * Displays when one or more rows are selected in a data grid table.
 * Provides bulk action buttons with optional delete confirmation.
 * When an action has a `confirmDelete` configuration, it will automatically
 * show a professional confirmation dialog instead of immediately executing the action.
 *
 * Features:
 * - Automatic delete confirmation dialogs
 * - Loading states during async operations
 * - Shows count of selected items
 * - Deselect all button
 * - Keyboard accessible
 * - Mobile responsive
 * - i18n support
 * - Smooth animations
 *
 * @example Basic usage
 * ```tsx
 * <DataGridBulkActions
 *   table={table}
 *   actions={[
 *     {
 *       label: "Export",
 *       icon: <Download />,
 *       onClick: (items) => exportItems(items)
 *     },
 *     {
 *       label: "Delete",
 *       icon: <Trash2 />,
 *       variant: "destructive",
 *       onClick: (items) => deleteItems(items)  // Will be called directly
 *     }
 *   ]}
 * />
 * ```
 *
 * @example With delete confirmation
 * ```tsx
 * <DataGridBulkActions
 *   table={table}
 *   actions={[
 *     {
 *       label: "Export",
 *       icon: <Download />,
 *       onClick: (items) => exportItems(items)
 *     },
 *     {
 *       label: "Delete Selected",
 *       icon: <Trash2 />,
 *       variant: "destructive",
 *       onClick: () => {}, // Required but not used when confirmDelete is present
 *       confirmDelete: {
 *         entityName: "cities",
 *         onConfirm: async (items) => {
 *           await bulkDeleteCities(items.map(item => item._id))
 *         }
 *       }
 *     }
 *   ]}
 * />
 * ```
 */
export function DataGridBulkActions<TData>({
  table,
  actions,
  className,
}: DataGridBulkActionsProps<TData>) {
  const tCommon = useTranslations("Common")
  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [activeDeleteAction, setActiveDeleteAction] = React.useState<BulkDeleteConfirmation<TData> | null>(null)
  const [itemsToDelete, setItemsToDelete] = React.useState<TData[]>([])

  if (selectedCount === 0) {
    return null
  }

  const selectedData = selectedRows.map((row) => row.original)

  // Handle action click - either show confirmation or execute directly
  const handleActionClick = React.useCallback((action: BulkAction<TData>) => {
    if (action.confirmDelete) {
      setActiveDeleteAction(action.confirmDelete)
      setItemsToDelete(selectedData)
      setDeleteDialogOpen(true)
    } else {
      action.onClick(selectedData)
    }
  }, [selectedData])

  // Handle delete confirmation
  const handleDeleteConfirm = React.useCallback(async () => {
    if (!activeDeleteAction) return

    setIsDeleting(true)
    try {
      await activeDeleteAction.onConfirm(itemsToDelete)
      setDeleteDialogOpen(false)
      setActiveDeleteAction(null)
      setItemsToDelete([])
      // Reset row selection after successful delete
      table.resetRowSelection()
    } catch (error) {
      // Error handling is done by the parent component/hook
      console.error("Bulk delete operation failed:", error)
    } finally {
      setIsDeleting(false)
    }
  }, [activeDeleteAction, itemsToDelete, table])

  // Handle dialog close
  const handleDialogClose = React.useCallback(() => {
    if (!isDeleting) {
      setDeleteDialogOpen(false)
      setActiveDeleteAction(null)
      setItemsToDelete([])
    }
  }, [isDeleting])

  return (
    <>
      <div
        className={`flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 animate-in fade-in slide-in-from-top-2 ${
          className || ""
        }`}
      >
        <div className="flex-1 text-sm text-muted-foreground">
          {tCommon("itemsSelected", { count: selectedCount })}
        </div>
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "default"}
              size="sm"
              onClick={() => handleActionClick(action)}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetRowSelection()}
            aria-label={tCommon("deselectAll")}
          >
            <X className="h-4 w-4 mr-1" />
            {tCommon("deselectAll")}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={handleDialogClose}
        onConfirm={handleDeleteConfirm}
        entityName={activeDeleteAction?.entityName}
        isDeleting={isDeleting}
        variant="bulk"
        count={itemsToDelete.length}
      />
    </>
  )
}
