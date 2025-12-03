"use client"

import * as React from "react"
import { FieldValues, FormState } from "react-hook-form"

export interface UseUnsavedChangesOptions<T extends FieldValues = FieldValues> {
  /**
   * The formState object from react-hook-form's useForm hook
   * Used to detect if the form has unsaved changes via isDirty
   */
  formState: FormState<T>

  /**
   * Callback executed when user confirms they want to leave without saving
   * Typically used to reset the form and close the dialog
   */
  onConfirmedClose: () => void

  /**
   * Whether the form is currently submitting
   * Used to prevent the unsaved changes dialog from showing during submit
   */
  isSubmitting?: boolean
}

export interface UseUnsavedChangesReturn {
  /**
   * Whether the unsaved changes confirmation dialog is open
   */
  showUnsavedDialog: boolean

  /**
   * Set the unsaved changes dialog open state
   */
  setShowUnsavedDialog: React.Dispatch<React.SetStateAction<boolean>>

  /**
   * Handler to wrap the dialog's onOpenChange prop
   * Intercepts close attempts when there are unsaved changes
   * @param open - The new open state being requested
   */
  handleOpenChange: (open: boolean) => void

  /**
   * Handler for when user confirms they want to discard changes
   * Closes both the unsaved dialog and executes onConfirmedClose
   */
  handleConfirmClose: () => void

  /**
   * Handler for when user wants to continue editing
   * Simply closes the unsaved changes dialog
   */
  handleCancelClose: () => void

  /**
   * Whether there are unsaved changes in the form
   */
  hasUnsavedChanges: boolean
}

/**
 * useUnsavedChanges - Hook for managing unsaved changes protection in form dialogs
 *
 * This hook provides a complete solution for detecting when a form has unsaved changes
 * and intercepting close attempts to show a confirmation dialog before discarding data.
 *
 * Features:
 * - Detects unsaved changes via react-hook-form's formState.isDirty
 * - Intercepts dialog close attempts (clicking outside, pressing Escape, etc.)
 * - Provides handlers for the confirmation dialog
 * - Allows immediate close when no changes are present
 *
 * @example
 * ```tsx
 * const form = useForm<FormData>()
 *
 * const {
 *   showUnsavedDialog,
 *   setShowUnsavedDialog,
 *   handleOpenChange,
 *   handleConfirmClose,
 *   handleCancelClose,
 * } = useUnsavedChanges({
 *   formState: form.formState,
 *   onConfirmedClose: () => {
 *     form.reset()
 *     onOpenChange(false)
 *   }
 * })
 *
 * return (
 *   <>
 *     <Dialog open={open} onOpenChange={handleOpenChange}>
 *       {/ * Dialog content * /}
 *     </Dialog>
 *
 *     <UnsavedChangesDialog
 *       open={showUnsavedDialog}
 *       onOpenChange={setShowUnsavedDialog}
 *       onConfirm={handleConfirmClose}
 *       onCancel={handleCancelClose}
 *     />
 *   </>
 * )
 * ```
 */
export function useUnsavedChanges<T extends FieldValues = FieldValues>({
  formState,
  onConfirmedClose,
  isSubmitting = false,
}: UseUnsavedChangesOptions<T>): UseUnsavedChangesReturn {
  // State to control the unsaved changes confirmation dialog
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false)

  // Check if the form has unsaved changes
  const hasUnsavedChanges = formState.isDirty && !isSubmitting

  /**
   * Intercepts dialog close attempts
   * If there are unsaved changes, shows the confirmation dialog instead of closing
   */
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      // If trying to close and there are unsaved changes
      if (!open && hasUnsavedChanges) {
        // Show confirmation dialog instead of closing immediately
        setShowUnsavedDialog(true)
        return
      }

      // If opening or closing without unsaved changes, proceed normally
      if (!open) {
        onConfirmedClose()
      }
    },
    [hasUnsavedChanges, onConfirmedClose]
  )

  /**
   * Handles user confirming they want to discard changes
   */
  const handleConfirmClose = React.useCallback(() => {
    setShowUnsavedDialog(false)
    onConfirmedClose()
  }, [onConfirmedClose])

  /**
   * Handles user choosing to continue editing
   */
  const handleCancelClose = React.useCallback(() => {
    setShowUnsavedDialog(false)
  }, [])

  return {
    showUnsavedDialog,
    setShowUnsavedDialog,
    handleOpenChange,
    handleConfirmClose,
    handleCancelClose,
    hasUnsavedChanges,
  }
}
