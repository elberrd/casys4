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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, CheckCircle2, XCircle, Eye } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"

interface CaseStatus {
  _id: Id<"caseStatuses">
  name: string
  nameEn?: string
  code: string
  description?: string
  category?: string
  color?: string
  sortOrder: number
  isActive: boolean
  createdAt: number
  updatedAt: number
}

interface CaseStatusesTableProps {
  caseStatuses: CaseStatus[]
  onView?: (id: Id<"caseStatuses">) => void
  onEdit: (id: Id<"caseStatuses">) => void
  onDelete: (id: Id<"caseStatuses">) => void
  onToggleActive?: (id: Id<"caseStatuses">, isActive: boolean) => void
}

export function CaseStatusesTable({
  caseStatuses,
  onView,
  onEdit,
  onDelete,
  onToggleActive
}: CaseStatusesTableProps) {
  const t = useTranslations('CaseStatuses')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"caseStatuses">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "case status",
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (caseStatus: CaseStatus) => {
      await onDelete(caseStatus._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

  const columns = useMemo<ColumnDef<CaseStatus>[]>(
    () => [
      createSelectColumn<CaseStatus>(),
      {
        accessorKey: "sortOrder",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('sortOrder')} />
        ),
        cell: ({ row }) => (
          <div className="w-12 text-center font-medium">
            {row.original.sortOrder}
          </div>
        ),
        size: 80,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('name')} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.color && (
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: row.original.color }}
              />
            )}
            <DataGridHighlightedCell text={row.original.name} />
          </div>
        ),
      },
      {
        accessorKey: "nameEn",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('nameEn')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.nameEn || "-"} />
        ),
      },
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('code')} />
        ),
        cell: ({ row }) => (
          <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
            {row.original.code}
          </code>
        ),
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('category')} />
        ),
        cell: ({ row }) => {
          const category = row.original.category
          if (!category) return <span className="text-muted-foreground">-</span>

          const categoryColors: Record<string, string> = {
            preparation: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
            in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
            review: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
            approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
            cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          }

          return (
            <Badge
              variant="outline"
              className={categoryColors[category] || ""}
            >
              {category}
            </Badge>
          )
        },
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('isActive')} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.isActive ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">{tCommon('active')}</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm">{tCommon('inactive')}</span>
              </>
            )}
          </div>
        ),
        filterFn: (row, id, value) => {
          if (value === "all") return true
          if (value === "active") return row.original.isActive
          if (value === "inactive") return !row.original.isActive
          return true
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{tCommon('actions')}</span>,
        cell: ({ row }) => (
          <DataGridRowActions
            actions={[
              ...(onView
                ? [
                    {
                      label: tCommon('view'),
                      icon: <Eye className="h-4 w-4" />,
                      onClick: () => onView(row.original._id),
                    },
                  ]
                : []),
              {
                label: tCommon('edit'),
                icon: <Edit className="h-4 w-4" />,
                onClick: () => onEdit(row.original._id),
                variant: "default",
              },
              ...(onToggleActive ? [{
                label: row.original.isActive ? tCommon('deactivate') : tCommon('activate'),
                icon: row.original.isActive ?
                  <XCircle className="h-4 w-4" /> :
                  <CheckCircle2 className="h-4 w-4" />,
                onClick: () => onToggleActive(row.original._id, !row.original.isActive),
                variant: "default" as const,
              }] : []),
              {
                label: tCommon('delete'),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => deleteConfirmation.confirmDelete(row.original._id),
                variant: "destructive",
                separator: true,
              },
            ]}
          />
        ),
        size: 50,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, tCommon, onView, onEdit, onDelete, onToggleActive, deleteConfirmation]
  )

  const table = useReactTable({
    data: caseStatuses,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: globalFuzzyFilter,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize: 50,
      },
      sorting: [
        {
          id: "sortOrder",
          desc: false,
        },
      ],
    },
    state: {
      rowSelection,
    },
  })

  return (
    <DataGrid
      table={table}
      recordCount={caseStatuses.length}
      emptyMessage={t('noResults')}
      onRowClick={onView ? (row) => onView(row._id) : undefined}
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
        <DataGridBulkActions
          table={table}
          actions={[
            {
              label: tCommon('deleteSelected'),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: (selectedRows) => {
                bulkDeleteConfirmation.confirmBulkDelete(selectedRows)
              },
              variant: "destructive",
            },
          ]}
        />
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
        entityName="case status"
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
