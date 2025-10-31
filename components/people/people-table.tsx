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
import { Edit, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { formatCPF } from "@/lib/utils/document-masks"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"

interface Person {
  _id: Id<"people">
  fullName: string
  email?: string
  cpf?: string
  birthDate?: string
  birthCityId?: Id<"cities">
  nationalityId?: Id<"countries">
  maritalStatus?: string
  profession?: string
  motherName?: string
  fatherName?: string
  phoneNumber?: string
  address?: string
  currentCityId?: Id<"cities">
  photoUrl?: string
  notes?: string
  createdAt: number
  updatedAt: number
  nationality: {
    name: string
  } | null
}

interface PeopleTableProps {
  people: Person[]
  onEdit: (id: Id<"people">) => void
  onDelete: (id: Id<"people">) => void
  onView?: (id: Id<"people">) => void
}

export function PeopleTable({ people, onEdit, onDelete, onView }: PeopleTableProps) {
  const t = useTranslations('People')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"people">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "person",
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: Person) => {
      if (onDelete) await onDelete(item._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

  const columns = useMemo<ColumnDef<Person>[]>(
    () => [
      createSelectColumn<Person>(),
      {
        accessorKey: "fullName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('fullName')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.fullName} />
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('email')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email || '-'}</span>
        ),
      },
      {
        accessorKey: "cpf",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('cpf')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.cpf ? formatCPF(row.original.cpf) : '-'}
          </span>
        ),
      },
      {
        id: "nationality",
        accessorFn: (row) => row.nationality?.name || '-',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('nationality')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.nationality?.name || '-'}
          </span>
        ),
      },
      {
        accessorKey: "profession",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('profession')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.profession || '-'}</span>
        ),
      },
      {
        accessorKey: "phoneNumber",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('phoneNumber')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.phoneNumber || '-'}</span>
        ),
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
    [t, tCommon, onEdit, onDelete, deleteConfirmation]
  )

  const table = useReactTable({
    data: people,
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
      recordCount={people.length}
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
        entityName="person"
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
