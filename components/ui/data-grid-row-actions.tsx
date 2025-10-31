"use client"

import * as React from "react"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslations } from "next-intl"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"

/**
 * Configuration for delete confirmation dialog
 *
 * @example
 * ```tsx
 * {
 *   label: "Delete",
 *   icon: <Trash2 />,
 *   variant: "destructive",
 *   confirmDelete: {
 *     entityName: "City",
 *     onConfirm: async () => {
 *       await deleteCity(id)
 *     }
 *   }
 * }
 * ```
 */
export interface DeleteConfirmation {
  /**
   * The name of the entity being deleted (e.g., "City", "Person")
   * Used in the confirmation dialog description
   */
  entityName: string

  /**
   * Async callback that performs the delete operation
   * Should throw an error if the operation fails
   */
  onConfirm: () => Promise<void>
}

/**
 * Individual row action configuration
 */
export interface DataGridRowAction {
  /**
   * The label text displayed for the action
   */
  label: string

  /**
   * Optional icon to display before the label
   */
  icon?: React.ReactNode

  /**
   * Callback when the action is clicked
   * Not used if confirmDelete is provided
   */
  onClick: () => void

  /**
   * Visual variant for the action
   * "destructive" should be used for delete actions
   */
  variant?: "default" | "destructive"

  /**
   * Whether to show a separator after this action
   */
  separator?: boolean

  /**
   * Optional delete confirmation configuration
   * When provided, clicking the action will show a confirmation dialog
   * instead of immediately calling onClick
   *
   * @example
   * ```tsx
   * confirmDelete: {
   *   entityName: t('entityName'),
   *   onConfirm: async () => await deleteItem(id)
   * }
   * ```
   */
  confirmDelete?: DeleteConfirmation
}

interface DataGridRowActionsProps {
  /**
   * Array of actions to display in the dropdown menu
   */
  actions: DataGridRowAction[]

  /**
   * Optional CSS class name for the trigger button
   */
  className?: string
}

/**
 * DataGridRowActions - Dropdown menu for row-level actions in data grids
 *
 * Provides a consistent actions menu for table rows with optional delete confirmation.
 * When an action has a `confirmDelete` configuration, it will automatically show
 * a professional confirmation dialog instead of immediately executing the action.
 *
 * Features:
 * - Automatic delete confirmation dialogs
 * - Loading states during async operations
 * - Keyboard accessible
 * - Mobile responsive
 * - i18n support
 *
 * @example Basic usage
 * ```tsx
 * <DataGridRowActions
 *   actions={[
 *     {
 *       label: "Edit",
 *       icon: <Edit />,
 *       onClick: () => navigate(`/edit/${id}`)
 *     },
 *     {
 *       label: "Delete",
 *       icon: <Trash2 />,
 *       variant: "destructive",
 *       onClick: () => deleteItem(id)  // Will be called directly
 *     }
 *   ]}
 * />
 * ```
 *
 * @example With delete confirmation
 * ```tsx
 * <DataGridRowActions
 *   actions={[
 *     {
 *       label: "Edit",
 *       icon: <Edit />,
 *       onClick: () => navigate(`/edit/${id}`)
 *     },
 *     {
 *       label: "Delete",
 *       icon: <Trash2 />,
 *       variant: "destructive",
 *       onClick: () => {}, // Required but not used when confirmDelete is present
 *       confirmDelete: {
 *         entityName: t('entityName'),
 *         onConfirm: async () => await deleteItem(id)
 *       }
 *     }
 *   ]}
 * />
 * ```
 */
export function DataGridRowActions({
  actions,
  className,
}: DataGridRowActionsProps) {
  const tCommon = useTranslations("Common")

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [activeDeleteAction, setActiveDeleteAction] = React.useState<DeleteConfirmation | null>(null)

  // Handle action click - either show confirmation or execute directly
  const handleActionClick = React.useCallback((action: DataGridRowAction) => {
    if (action.confirmDelete) {
      setActiveDeleteAction(action.confirmDelete)
      setDeleteDialogOpen(true)
    } else {
      action.onClick()
    }
  }, [])

  // Handle delete confirmation
  const handleDeleteConfirm = React.useCallback(async () => {
    if (!activeDeleteAction) return

    setIsDeleting(true)
    try {
      await activeDeleteAction.onConfirm()
      setDeleteDialogOpen(false)
      setActiveDeleteAction(null)
    } catch (error) {
      // Error handling is done by the parent component/hook
      console.error("Delete operation failed:", error)
    } finally {
      setIsDeleting(false)
    }
  }, [activeDeleteAction])

  // Handle dialog close
  const handleDialogClose = React.useCallback(() => {
    if (!isDeleting) {
      setDeleteDialogOpen(false)
      setActiveDeleteAction(null)
    }
  }, [isDeleting])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className={className}
            aria-label={tCommon("moreActions")}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action, index) => (
            <div key={index}>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleActionClick(action)
                }}
                className={
                  action.variant === "destructive"
                    ? "text-destructive focus:text-destructive"
                    : ""
                }
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </DropdownMenuItem>
              {action.separator && index < actions.length - 1 && (
                <DropdownMenuSeparator />
              )}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={handleDialogClose}
        onConfirm={handleDeleteConfirm}
        entityName={activeDeleteAction?.entityName}
        isDeleting={isDeleting}
        variant="single"
      />
    </>
  )
}
