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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Eye } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"

interface PersonCompany {
  _id: Id<"peopleCompanies">
  personId?: Id<"people">
  companyId?: Id<"companies">
  role: string
  startDate?: string
  endDate?: string
  isCurrent?: boolean
  person: {
    _id: Id<"people">
    fullName: string
  } | null
  company: {
    _id: Id<"companies">
    name: string
  } | null
}

interface PeopleCompaniesTableProps {
  relationships: PersonCompany[]
  onView?: (id: Id<"peopleCompanies">) => void
  onEdit: (id: Id<"peopleCompanies">) => void
  onDelete: (id: Id<"peopleCompanies">) => void
}

export function PeopleCompaniesTable({ relationships, onView, onEdit, onDelete }: PeopleCompaniesTableProps) {
  const t = useTranslations('PeopleCompanies')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"peopleCompanies">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "employment record",
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: PersonCompany) => {
      if (onDelete) await onDelete(item._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

  const columns = useMemo<ColumnDef<PersonCompany>[]>(
    () => [
      createSelectColumn<PersonCompany>(),
      {
        id: "personName",
        accessorFn: (row) => row.person?.fullName || '-',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('person')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.person?.fullName || '-'} />
        ),
      },
      {
        id: "companyName",
        accessorFn: (row) => row.company?.name || '-',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('company')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.company?.name || '-'}
          </span>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('role')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.role}</span>
        ),
      },
      {
        accessorKey: "startDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('startDate')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.startDate ? new Date(row.original.startDate).toLocaleDateString() : "-"}
          </span>
        ),
      },
      {
        accessorKey: "endDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('endDate')} />
        ),
        cell: ({ row }) => {
          if (row.original.isCurrent) {
            return (
              <Badge variant="default">{t('current')}</Badge>
            )
          }
          return (
            <span className="text-muted-foreground">
              {row.original.endDate
                ? new Date(row.original.endDate).toLocaleDateString()
                : '-'}
            </span>
          )
        },
      },
      {
        accessorKey: "isCurrent",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('status')} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isCurrent ? "default" : "secondary"}>
            {row.original.isCurrent ? t('currentEmployment') : t('pastEmployment')}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
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
    [t, tCommon, onView, onEdit, onDelete]
  )

  const table = useReactTable({
    data: relationships,
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
    },
    state: {
      rowSelection,
    },
  })

  return (
    <DataGrid
      table={table}
      recordCount={relationships.length}
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
        entityName="employment record"
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
