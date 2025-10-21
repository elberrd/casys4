"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "@/hooks/use-toast"

export interface UseDeleteConfirmationProps<T = unknown> {
  /**
   * Async function to delete the item
   * Should throw an error if deletion fails
   */
  onDelete: (item: T) => Promise<void>

  /**
   * Optional entity name for display in confirmation dialog
   * Uses i18n key if available
   */
  entityName?: string

  /**
   * Optional success callback after successful deletion
   */
  onSuccess?: () => void

  /**
   * Optional error callback if deletion fails
   */
  onError?: (error: Error) => void
}

export interface UseDeleteConfirmationReturn<T = unknown> {
  /**
   * Whether the confirmation dialog is open
   */
  isOpen: boolean

  /**
   * Whether a delete operation is in progress
   */
  isDeleting: boolean

  /**
   * The item currently being deleted
   */
  itemToDelete: T | null

  /**
   * Open the confirmation dialog for a specific item
   */
  confirmDelete: (item: T) => void

  /**
   * Handle the confirm action (executes the delete)
   */
  handleConfirm: () => Promise<void>

  /**
   * Handle the cancel action (closes the dialog)
   */
  handleCancel: () => void
}

/**
 * useDeleteConfirmation - Hook for managing single item delete confirmations
 *
 * This hook manages the state and flow for delete confirmation dialogs.
 * It handles opening/closing the dialog, executing the delete operation,
 * and providing feedback via toast notifications.
 *
 * @example
 * ```tsx
 * const deleteConfirmation = useDeleteConfirmation({
 *   onDelete: async (id) => {
 *     await deleteCity(id)
 *   },
 *   entityName: t('entityName'),
 *   onSuccess: () => {
 *     router.refresh()
 *   }
 * })
 *
 * // In your component:
 * <Button onClick={() => deleteConfirmation.confirmDelete(city._id)}>
 *   Delete
 * </Button>
 *
 * <DeleteConfirmationDialog
 *   open={deleteConfirmation.isOpen}
 *   onOpenChange={deleteConfirmation.handleCancel}
 *   onConfirm={deleteConfirmation.handleConfirm}
 *   entityName={t('entityName')}
 *   isDeleting={deleteConfirmation.isDeleting}
 * />
 * ```
 */
export function useDeleteConfirmation<T = unknown>({
  onDelete,
  entityName = "",
  onSuccess,
  onError,
}: UseDeleteConfirmationProps<T>): UseDeleteConfirmationReturn<T> {
  const tCommon = useTranslations("Common")

  // State management
  const [isOpen, setIsOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<T | null>(null)

  /**
   * Open the confirmation dialog for a specific item
   */
  const confirmDelete = React.useCallback((item: T) => {
    setItemToDelete(item)
    setIsOpen(true)
  }, [])

  /**
   * Close the dialog and reset state
   */
  const handleCancel = React.useCallback(() => {
    if (isDeleting) return // Prevent closing during operation
    setIsOpen(false)
    setItemToDelete(null)
  }, [isDeleting])

  /**
   * Execute the delete operation
   */
  const handleConfirm = React.useCallback(async () => {
    if (!itemToDelete) return

    setIsDeleting(true)

    try {
      await onDelete(itemToDelete)

      // Success feedback
      toast({
        title: tCommon("deleteSuccess"),
        description: entityName
          ? `${entityName} ${tCommon("deleteSuccess").toLowerCase()}`
          : undefined,
      })

      // Close dialog and reset state
      setIsOpen(false)
      setItemToDelete(null)

      // Call success callback
      onSuccess?.()
    } catch (error) {
      // Error feedback
      const errorMessage = error instanceof Error ? error.message : tCommon("deleteError")

      toast({
        title: tCommon("deleteError"),
        description: errorMessage,
        variant: "destructive",
      })

      // Call error callback
      onError?.(error instanceof Error ? error : new Error(String(error)))
    } finally {
      setIsDeleting(false)
    }
  }, [itemToDelete, onDelete, onSuccess, onError, entityName, tCommon])

  return {
    isOpen,
    isDeleting,
    itemToDelete,
    confirmDelete,
    handleConfirm,
    handleCancel,
  }
}
