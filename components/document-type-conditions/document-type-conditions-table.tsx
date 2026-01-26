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
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility"
import { DataGridFilter } from "@/components/ui/data-grid-filter"
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions"
import { DataGridBulkActions } from "@/components/ui/data-grid-bulk-actions"
import { DataGridHighlightedCell } from "@/components/ui/data-grid-highlighted-cell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"

interface DocumentTypeCondition {
  _id: Id<"documentTypeConditions">
  _creationTime: number
  name: string
  code?: string
  description?: string
  isRequired: boolean
  relativeExpirationDays?: number
  isActive: boolean
  sortOrder?: number
}

interface DocumentTypeConditionsTableProps {
  conditions: DocumentTypeCondition[]
  onEdit: (id: Id<"documentTypeConditions">) => void
  onDelete: (id: Id<"documentTypeConditions">) => void
  onCreateNew: () => void
}

export function DocumentTypeConditionsTable({
  conditions,
  onEdit,
  onDelete,
  onCreateNew
}: DocumentTypeConditionsTableProps) {
  const t = useTranslations('DocumentTypeConditions')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"documentTypeConditions">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "condition",
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: DocumentTypeCondition) => {
      if (onDelete) await onDelete(item._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

  const columns = useMemo<ColumnDef<DocumentTypeCondition>[]>(
    () => [
      createSelectColumn<DocumentTypeCondition>(),
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('name')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.name} />
        ),
        size: 200,
      },
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('code')} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-muted-foreground">{row.original.code || '-'}</span>
        ),
        size: 150,
      },
      {
        accessorKey: "isRequired",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('columns.isRequired')} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isRequired ? "default" : "secondary"}>
            {row.original.isRequired ? t('required') : t('optional')}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
        size: 120,
      },
      {
        accessorKey: "relativeExpirationDays",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('columns.expirationDays')} />
        ),
        cell: ({ row }) => {
          const days = row.original.relativeExpirationDays
          if (!days) return <span className="text-muted-foreground">{t('noDays')}</span>
          return <span>{days} {t('days')}</span>
        },
        size: 150,
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('columns.isActive')} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? tCommon('active') : tCommon('inactive')}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
        size: 100,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{tCommon('actions')}</span>,
        cell: ({ row }) => (
          <DataGridRowActions
            actions={[
              {
                label: tCommon('edit'),
                icon: <Edit className="h-4 w-4" />,
                onClick: () => onEdit(row.original._id),
                variant: "default" as const,
              },
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
    [t, tCommon, onEdit, deleteConfirmation]
  )

  const table = useReactTable({
    data: conditions,
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
      columnVisibility: {
        code: false,
      },
    },
    state: {
      rowSelection,
    },
  })

  return (
    <DataGrid
      table={table}
      recordCount={conditions.length}
      emptyMessage={t('noConditions')}
      onRowClick={(row) => onEdit(row._id)}
      tableLayout={{
        columnsVisibility: true,
      }}
    >
      <div className="w-full space-y-2.5">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <DataGridFilter table={table} className="w-full sm:max-w-sm" />
          <div className="flex flex-col sm:flex-row gap-2">
            <DataGridColumnVisibility
              table={table}
              trigger={<Button variant="outline" size="sm" className="w-full sm:w-auto">Columns</Button>}
            />
            <Button onClick={onCreateNew} size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {t('add')}
            </Button>
          </div>
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
        entityName="condition"
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
