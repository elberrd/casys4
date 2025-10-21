"use client"

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  RowSelectionState,
} from "@tanstack/react-table"
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid"
import { DataGridTable } from "@/components/ui/data-grid-table"
import { DataGridPagination } from "@/components/ui/data-grid-pagination"
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header"
import { DataGridFilter } from "@/components/ui/data-grid-filter"
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility"
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions"
import { DataGridBulkActions } from "@/components/ui/data-grid-bulk-actions"
import { DataGridHighlightedCell } from "@/components/ui/data-grid-highlighted-cell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Eye, CheckCircle, UserPlus, Calendar, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"

interface Task {
  _id: Id<"tasks">
  title: string
  description: string
  status: string
  priority: string
  dueDate: string
  createdAt: number
  individualProcess?: {
    _id: Id<"individualProcesses">
    status: string
    person?: {
      _id: Id<"people">
      fullName: string
    } | null
  } | null
  mainProcess?: {
    _id: Id<"mainProcesses">
    referenceNumber: string
    status: string
  } | null
  assignedToUser?: {
    _id: string
    userId: Id<"users">
    fullName: string
    email: string
  } | null
}

interface TasksTableProps {
  tasks: Task[]
  onView?: (id: Id<"tasks">) => void
  onEdit?: (id: Id<"tasks">) => void
  onDelete?: (id: Id<"tasks">) => void
  onComplete?: (id: Id<"tasks">) => void
  onReassign?: (id: Id<"tasks">) => void
  onExtendDeadline?: (id: Id<"tasks">) => void
  onUpdateStatus?: (id: Id<"tasks">) => void
  onBulkReassign?: (selected: Task[]) => void
  onBulkUpdateStatus?: (selected: Task[]) => void
}

export function TasksTable({
  tasks,
  onView,
  onEdit,
  onDelete,
  onComplete,
  onReassign,
  onExtendDeadline,
  onUpdateStatus,
  onBulkReassign,
  onBulkUpdateStatus,
}: TasksTableProps) {
  const t = useTranslations('Tasks')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"tasks">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "task",
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: Task) => {
      if (onDelete) await onDelete(item._id)
    },
    onSuccess: () => {
      table.resetRowSelection()
    },
  })

  // Helper to check if task is overdue
  const isOverdue = (dueDate: string, status: string) => {
    if (status === "completed" || status === "cancelled") return false
    const today = new Date().toISOString().split("T")[0]
    return dueDate < today
  }

  // Helper to get priority badge variant
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive"
      case "high":
        return "default"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  // Helper to get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in_progress":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "todo":
        return "outline"
      default:
        return "outline"
    }
  }

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      createSelectColumn<Task>(),
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('title')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.title} />
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('status')} />
        ),
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.status)}>
            {t(`statuses.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        accessorKey: "priority",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('priority')} />
        ),
        cell: ({ row }) => (
          <Badge variant={getPriorityVariant(row.original.priority)}>
            {t(`priorities.${row.original.priority}`)}
          </Badge>
        ),
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('dueDate')} />
        ),
        cell: ({ row }) => {
          const overdue = isOverdue(row.original.dueDate, row.original.status)
          return (
            <div className="flex items-center gap-2">
              <span className={overdue ? "text-destructive font-medium" : "text-sm"}>
                {row.original.dueDate}
              </span>
              {overdue && (
                <Badge variant="destructive" className="text-xs">
                  {t('overdue')}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "assignedToUser.fullName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('assignedTo')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.assignedToUser?.fullName || "-"}
          </span>
        ),
      },
      {
        accessorKey: "mainProcess.referenceNumber",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('mainProcess')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-mono">
            {row.original.mainProcess?.referenceNumber || "-"}
          </span>
        ),
      },
      {
        accessorKey: "individualProcess.person.fullName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('person')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.individualProcess?.person?.fullName || "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{tCommon('actions')}</span>,
        cell: ({ row }) => {
          const actions = []

          if (onView) {
            actions.push({
              label: tCommon('view'),
              icon: <Eye className="h-4 w-4" />,
              onClick: () => onView(row.original._id),
              variant: "default" as const,
            })
          }

          if (onUpdateStatus) {
            actions.push({
              label: t('updateStatus'),
              icon: <RefreshCw className="h-4 w-4" />,
              onClick: () => onUpdateStatus(row.original._id),
              variant: "default" as const,
            })
          }

          if (onComplete && row.original.status !== "completed" && row.original.status !== "cancelled") {
            actions.push({
              label: t('markComplete'),
              icon: <CheckCircle className="h-4 w-4" />,
              onClick: () => onComplete(row.original._id),
              variant: "default" as const,
            })
          }

          if (onReassign) {
            actions.push({
              label: t('reassign'),
              icon: <UserPlus className="h-4 w-4" />,
              onClick: () => onReassign(row.original._id),
              variant: "default" as const,
            })
          }

          if (onExtendDeadline && row.original.status !== "completed" && row.original.status !== "cancelled") {
            actions.push({
              label: t('extendDeadline'),
              icon: <Calendar className="h-4 w-4" />,
              onClick: () => onExtendDeadline(row.original._id),
              variant: "default" as const,
            })
          }

          if (onEdit) {
            actions.push({
              label: tCommon('edit'),
              icon: <Edit className="h-4 w-4" />,
              onClick: () => onEdit(row.original._id),
              variant: "default" as const,
            })
          }

          if (onDelete) {
            actions.push({
              label: tCommon('delete'),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => deleteConfirmation.confirmDelete(row.original._id),
              variant: "destructive" as const,
              separator: true,
            })
          }

          return <DataGridRowActions actions={actions} />
        },
        size: 50,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, tCommon, onView, onEdit, onDelete, onComplete, onReassign, onExtendDeadline, onUpdateStatus]
  )

  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: globalFuzzyFilter,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  })

  return (
    <DataGrid
      table={table}
      recordCount={tasks.length}
      emptyMessage={t('noResults')}
      tableLayout={{
        columnsVisibility: true,
      }}
    >
      <div className="w-full space-y-2.5">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <DataGridFilter table={table} className="w-full sm:max-w-sm" />
          <DataGridColumnVisibility
            table={table}
            trigger={<Button variant="outline" size="sm" className="w-full sm:w-auto">Columns</Button>}
          />
        </div>
        {(onDelete || onBulkReassign || onBulkUpdateStatus) && (
          <DataGridBulkActions
            table={table}
            actions={[
              ...(onBulkReassign ? [{
                label: t('reassignSelected'),
                icon: <UserPlus className="h-4 w-4" />,
                onClick: async (selectedRows: Task[]) => {
                  onBulkReassign(selectedRows)
                },
                variant: "default" as const,
              }] : []),
              ...(onBulkUpdateStatus ? [{
                label: t('updateStatusSelected'),
                icon: <RefreshCw className="h-4 w-4" />,
                onClick: async (selectedRows: Task[]) => {
                  onBulkUpdateStatus(selectedRows)
                },
                variant: "default" as const,
              }] : []),
              ...(onDelete ? [{
                label: tCommon('deleteSelected'),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: (selectedRows: Task[]) => {
                bulkDeleteConfirmation.confirmBulkDelete(selectedRows)
              },
                variant: "destructive" as const,
              }] : []),
            ]}
          />
        )}
        <DataGridContainer>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>
        <DataGridPagination />
      </div>

      {/* Delete confirmation dialogs */}
      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={deleteConfirmation.handleCancel}
        onConfirm={deleteConfirmation.handleConfirm}
        entityName="task"
        isDeleting={deleteConfirmation.isDeleting}
      />

      <DeleteConfirmationDialog
        open={bulkDeleteConfirmation.isOpen}
        onOpenChange={bulkDeleteConfirmation.handleCancel}
        onConfirm={bulkDeleteConfirmation.handleConfirm}
        variant="bulk"
        count={bulkDeleteConfirmation.itemsToDelete.length}
        isDeleting={bulkDeleteConfirmation.isDeleting}
      />
    </DataGrid>
  )
}
