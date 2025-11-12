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
import { Edit, Trash2, Eye } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCountryTranslation } from "@/lib/i18n/countries"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"

interface City {
  _id: Id<"cities">
  name: string
  stateId?: Id<"states">
  hasFederalPolice?: boolean
  state: {
    _id: Id<"states">
    name: string
    code?: string
    countryId?: Id<"countries">
  } | null
  country: {
    _id: Id<"countries">
    name: string
    code: string
    iso3: string
    flag?: string
  } | null
}

interface CitiesTableProps {
  cities: City[]
  onView?: (id: Id<"cities">) => void
  onEdit: (id: Id<"cities">) => void
  onDelete: (id: Id<"cities">) => void
}

export function CitiesTable({ cities, onView, onEdit, onDelete }: CitiesTableProps) {
  const t = useTranslations('Cities')
  const tCommon = useTranslations('Common')
  const getCountryName = useCountryTranslation()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"cities">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "city",
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (city: City) => {
      await onDelete(city._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

  const columns = useMemo<ColumnDef<City>[]>(
    () => [
      createSelectColumn<City>(),
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('name')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.name} />
        ),
      },
      {
        accessorKey: "state.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('state')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.state?.name || "-"} />
        ),
      },
      {
        accessorKey: "country.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('country')} />
        ),
        cell: ({ row }) => {
          const country = row.original.country
          if (!country) return <DataGridHighlightedCell text="-" />

          const translatedName = getCountryName(country.code) || country.name
          return (
            <div className="flex items-center gap-2">
              {country.flag && <span className="text-lg">{country.flag}</span>}
              <DataGridHighlightedCell text={translatedName} />
            </div>
          )
        },
      },
      {
        accessorKey: "hasFederalPolice",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('hasFederalPolice')} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.hasFederalPolice ? "default" : "secondary"}>
            {row.original.hasFederalPolice ? "Yes" : "No"}
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
    [t, tCommon, onView, onEdit, onDelete, deleteConfirmation]
  )

  const table = useReactTable({
    data: cities,
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
      recordCount={cities.length}
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
        entityName="city"
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
