"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "@/hooks/use-toast"

export interface UseBulkDeleteConfirmationProps<T = unknown> {
  /**
   * Async function to delete a single item
   * Should throw an error if deletion fails
   * Will be called for each item in the bulk operation
   */
  onDelete: (item: T) => Promise<void>

  /**
   * Optional success callback after successful bulk deletion
   * Receives the count of successfully deleted items
   */
  onSuccess?: (successCount: number) => void

  /**
   * Optional error callback if any deletions fail
   * Receives an error and the count of failed items
   */
  onError?: (error: Error, failedCount: number) => void
}

export interface UseBulkDeleteConfirmationReturn<T = unknown> {
  /**
   * Whether the confirmation dialog is open
   */
  isOpen: boolean

  /**
   * Whether a bulk delete operation is in progress
   */
  isDeleting: boolean

  /**
   * The items currently queued for deletion
   */
  itemsToDelete: T[]

  /**
   * Open the confirmation dialog for multiple items
   */
  confirmBulkDelete: (items: T[]) => void

  /**
   * Handle the confirm action (executes the bulk delete)
   */
  handleConfirm: () => Promise<void>

  /**
   * Handle the cancel action (closes the dialog)
   */
  handleCancel: () => void
}

/**
 * useBulkDeleteConfirmation - Hook for managing bulk delete confirmations
 *
 * This hook manages the state and flow for bulk delete operations.
 * It handles opening/closing the dialog, executing delete operations
 * for multiple items, tracking success/failure counts, and providing
 * appropriate feedback via toast notifications.
 *
 * Features:
 * - Executes deletions sequentially to avoid overwhelming the server
 * - Tracks successful and failed deletions separately
 * - Continues processing even if some deletions fail
 * - Provides detailed feedback about partial successes
 *
 * @example
 * ```tsx
 * const bulkDelete = useBulkDeleteConfirmation({
 *   onDelete: async (id) => {
 *     await deleteCity(id)
 *   },
 *   onSuccess: (count) => {
 *     router.refresh()
 *   }
 * })
 *
 * // In your component:
 * <Button onClick={() => bulkDelete.confirmBulkDelete(selectedRows)}>
 *   Delete Selected
 * </Button>
 *
 * <DeleteConfirmationDialog
 *   open={bulkDelete.isOpen}
 *   onOpenChange={bulkDelete.handleCancel}
 *   onConfirm={bulkDelete.handleConfirm}
 *   variant="bulk"
 *   count={bulkDelete.itemsToDelete.length}
 *   isDeleting={bulkDelete.isDeleting}
 * />
 * ```
 */
export function useBulkDeleteConfirmation<T = unknown>({
  onDelete,
  onSuccess,
  onError,
}: UseBulkDeleteConfirmationProps<T>): UseBulkDeleteConfirmationReturn<T> {
  const tCommon = useTranslations("Common")

  // State management
  const [isOpen, setIsOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [itemsToDelete, setItemsToDelete] = React.useState<T[]>([])

  /**
   * Open the confirmation dialog for multiple items
   */
  const confirmBulkDelete = React.useCallback((items: T[]) => {
    if (items.length === 0) return
    setItemsToDelete(items)
    setIsOpen(true)
  }, [])

  /**
   * Close the dialog and reset state
   */
  const handleCancel = React.useCallback(() => {
    if (isDeleting) return // Prevent closing during operation
    setIsOpen(false)
    setItemsToDelete([])
  }, [isDeleting])

  /**
   * Execute the bulk delete operation
   * Processes items sequentially and tracks success/failure
   */
  const handleConfirm = React.useCallback(async () => {
    if (itemsToDelete.length === 0) return

    setIsDeleting(true)

    const totalCount = itemsToDelete.length
    let successCount = 0
    let failedCount = 0
    const errors: Error[] = []

    try {
      // Process deletions sequentially to avoid overwhelming the server
      for (const item of itemsToDelete) {
        try {
          await onDelete(item)
          successCount++
        } catch (error) {
          failedCount++
          errors.push(error instanceof Error ? error : new Error(String(error)))
        }
      }

      // Provide feedback based on results
      if (failedCount === 0) {
        // All deletions succeeded
        toast({
          title: tCommon("bulkDeleteSuccess", { count: successCount }),
          description: `${successCount} ${
            successCount === 1 ? "item" : "items"
          } deleted successfully`,
        })

        // Call success callback with count
        onSuccess?.(successCount)
      } else if (successCount === 0) {
        // All deletions failed
        toast({
          title: tCommon("bulkDeleteError"),
          description: `Failed to delete ${failedCount} ${
            failedCount === 1 ? "item" : "items"
          }`,
          variant: "destructive",
        })

        // Call error callback with aggregated error
        const aggregatedError = new Error(
          `Failed to delete ${failedCount} items: ${errors.map((e) => e.message).join(", ")}`
        )
        onError?.(aggregatedError, failedCount)
      } else {
        // Partial success
        toast({
          title: "Partial Success",
          description: `Successfully deleted ${successCount} of ${totalCount} items. ${failedCount} failed.`,
          variant: "destructive",
        })

        // Call both callbacks for partial success
        onSuccess?.(successCount)
        const aggregatedError = new Error(
          `Partial failure: ${failedCount} items failed to delete`
        )
        onError?.(aggregatedError, failedCount)
      }

      // Close dialog and reset state
      setIsOpen(false)
      setItemsToDelete([])
    } catch (error) {
      // Unexpected error during the bulk operation
      toast({
        title: tCommon("bulkDeleteError"),
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })

      onError?.(error instanceof Error ? error : new Error(String(error)), totalCount)
    } finally {
      setIsDeleting(false)
    }
  }, [itemsToDelete, onDelete, onSuccess, onError, tCommon])

  return {
    isOpen,
    isDeleting,
    itemsToDelete,
    confirmBulkDelete,
    handleConfirm,
    handleCancel,
  }
}
