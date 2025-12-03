"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"
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

export interface UnsavedChangesDialogProps {
  /**
   * Controls the open state of the dialog
   */
  open: boolean

  /**
   * Callback when the dialog open state changes
   */
  onOpenChange: (open: boolean) => void

  /**
   * Callback when the user confirms they want to leave without saving
   */
  onConfirm: () => void

  /**
   * Callback when the user wants to continue editing
   */
  onCancel: () => void

  /**
   * Optional custom title for the dialog
   * Defaults to i18n key "UnsavedChanges.title"
   */
  title?: string

  /**
   * Optional custom description for the dialog
   * Defaults to i18n key "UnsavedChanges.description"
   */
  description?: string
}

/**
 * UnsavedChangesDialog - A professional confirmation dialog for unsaved form changes
 *
 * This component provides a consistent experience when users try to close a form
 * or navigate away from a page with unsaved changes. It warns them about potential
 * data loss and gives them the option to stay or leave.
 *
 * Features:
 * - Professional UI with warning icon
 * - Full i18n support (Portuguese and English)
 * - Mobile responsive with touch-friendly buttons
 * - Keyboard accessible
 * - Consistent styling with other dialogs in the application
 *
 * @example
 * ```tsx
 * <UnsavedChangesDialog
 *   open={showUnsavedDialog}
 *   onOpenChange={setShowUnsavedDialog}
 *   onConfirm={handleConfirmClose}
 *   onCancel={handleCancelClose}
 * />
 * ```
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
}: UnsavedChangesDialogProps) {
  const t = useTranslations("UnsavedChanges")

  // Handle confirm button click
  const handleConfirm = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onConfirm()
    },
    [onConfirm]
  )

  // Handle cancel button click
  const handleCancel = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onCancel()
    },
    [onCancel]
  )

  // Determine the dialog title
  const dialogTitle = title || t("title")

  // Determine the dialog description
  const dialogDescription = description || t("description")

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" aria-hidden="true" />
            </div>
            <AlertDialogTitle className="text-left">{dialogTitle}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left pt-2">
            {dialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={handleCancel}
            className="min-h-[44px] sm:min-h-[36px]"
          >
            {t("cancelButton")}
          </AlertDialogCancel>

          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="min-h-[44px] sm:min-h-[36px]"
          >
            {t("confirmButton")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
