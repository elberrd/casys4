"use client"

import * as React from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export interface DeleteConfirmationDialogProps {
  /**
   * Controls the open state of the dialog
   */
  open: boolean

  /**
   * Callback when the dialog open state changes
   */
  onOpenChange: (open: boolean) => void

  /**
   * Callback when the user confirms the deletion
   * Can be async to handle the delete operation
   */
  onConfirm: () => void | Promise<void>

  /**
   * Optional custom title for the dialog
   * Defaults to i18n key "deleteConfirmationTitle"
   */
  title?: string

  /**
   * Optional custom description for the dialog
   * Defaults to i18n key with entity name
   */
  description?: string

  /**
   * The name of the entity being deleted (e.g., "City", "Person")
   * Used in the default description message
   */
  entityName?: string

  /**
   * Loading state during the delete operation
   */
  isDeleting?: boolean

  /**
   * Variant of the dialog - affects messaging
   * - "single": Single item deletion
   * - "bulk": Multiple items deletion
   */
  variant?: "single" | "bulk"

  /**
   * Count of items to delete (for bulk operations)
   */
  count?: number
}

/**
 * DeleteConfirmationDialog - A professional, reusable delete confirmation modal
 *
 * This component provides a consistent delete confirmation experience across all tables
 * in the application. It wraps the existing AlertDialog component with delete-specific
 * styling and functionality.
 *
 * Features:
 * - Professional UI with danger icon and destructive styling
 * - Loading states during async operations
 * - Full i18n support
 * - Mobile responsive
 * - Keyboard accessible
 * - Supports both single and bulk delete operations
 *
 * @example
 * ```tsx
 * <DeleteConfirmationDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleDelete}
 *   entityName={t('entityName')}
 *   isDeleting={isDeleting}
 * />
 * ```
 *
 * @example Bulk delete
 * ```tsx
 * <DeleteConfirmationDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleBulkDelete}
 *   variant="bulk"
 *   count={selectedItems.length}
 *   isDeleting={isDeleting}
 * />
 * ```
 */
export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  entityName = "",
  isDeleting = false,
  variant = "single",
  count = 0,
}: DeleteConfirmationDialogProps) {
  const tCommon = useTranslations("Common")

  // Prevent closing the dialog during delete operation
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (isDeleting) return
      onOpenChange(newOpen)
    },
    [isDeleting, onOpenChange]
  )

  // Handle confirm with async support
  const handleConfirm = React.useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      try {
        await onConfirm()
      } catch (error) {
        // Error handling is done in the hook/parent component
        console.error("Delete operation failed:", error)
      }
    },
    [onConfirm]
  )

  // Determine the dialog title
  const dialogTitle = title || (
    variant === "bulk"
      ? tCommon("bulkDeleteConfirmationTitle")
      : tCommon("deleteConfirmationTitle")
  )

  // Determine the dialog description
  const dialogDescription = description || (
    variant === "bulk"
      ? tCommon("bulkDeleteConfirmationDescription", { count })
      : tCommon("deleteConfirmationDescription", { entityName })
  )

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            </div>
            <AlertDialogTitle className="text-left">{dialogTitle}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left pt-2">
            {dialogDescription}
            <span className="block mt-2 text-muted-foreground/80 text-xs">
              {tCommon("deleteConfirmationWarning")}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className="min-h-[44px] sm:min-h-[36px]"
          >
            {tCommon("cancel")}
          </AlertDialogCancel>

          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="min-h-[44px] sm:min-h-[36px]"
            aria-label={isDeleting ? tCommon("deleting") : tCommon("delete")}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {tCommon("deleting")}
              </>
            ) : (
              tCommon("delete")
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
