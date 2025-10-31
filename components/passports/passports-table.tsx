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

interface Passport {
  _id: Id<"passports">
  personId?: Id<"people">
  passportNumber: string
  issuingCountryId?: Id<"countries">
  issueDate?: string
  expiryDate?: string
  fileUrl?: string
  isActive?: boolean
  createdAt: number
  updatedAt: number
  person: {
    _id: Id<"people">
    fullName: string
  } | null
  issuingCountry: {
    _id: Id<"countries">
    name: string
  } | null
  status?: "Valid" | "Expiring Soon" | "Expired"
}

interface PassportsTableProps {
  passports: Passport[]
  onEdit: (id: Id<"passports">) => void
  onDelete: (id: Id<"passports">) => void
  onView?: (id: Id<"passports">) => void
}

function getStatusVariant(status: "Valid" | "Expiring Soon" | "Expired") {
  switch (status) {
    case "Valid":
      return "success"
    case "Expiring Soon":
      return "warning"
    case "Expired":
      return "destructive"
  }
}

export function PassportsTable({ passports, onEdit, onDelete, onView }: PassportsTableProps) {
  const t = useTranslations('Passports')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"passports">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "passport",
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: Passport) => {
      if (onDelete) await onDelete(item._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

  const columns = useMemo<ColumnDef<Passport>[]>(
    () => [
      createSelectColumn<Passport>(),
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
        accessorKey: "passportNumber",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('passportNumber')} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-muted-foreground">{row.original.passportNumber}</span>
        ),
      },
      {
        id: "issuingCountry",
        accessorFn: (row) => row.issuingCountry?.name || '-',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('issuingCountry')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.issuingCountry?.name || '-'}
          </span>
        ),
      },
      {
        accessorKey: "issueDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('issueDate')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.issueDate ? new Date(row.original.issueDate).toLocaleDateString() : '-'}
          </span>
        ),
      },
      {
        accessorKey: "expiryDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('expiryDate')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.expiryDate ? new Date(row.original.expiryDate).toLocaleDateString() : '-'}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('status')} />
        ),
        cell: ({ row }) => {
          const status = row.original.status
          if (!status) return <span className="text-muted-foreground">-</span>
          return (
            <Badge variant={getStatusVariant(status)}>
              {t(`status${status.replace(" ", "")}`)}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('isActive')} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "info" : "secondary"}>
            {row.original.isActive ? tCommon('active') : tCommon('inactive')}
          </Badge>
        ),
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
                      variant: "default" as const,
                    },
                  ]
                : []),
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
                variant: "destructive" as const,
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
    [t, tCommon, onEdit, onDelete, onView]
  )

  const table = useReactTable({
    data: passports,
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
      recordCount={passports.length}
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
        entityName="passport"
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
