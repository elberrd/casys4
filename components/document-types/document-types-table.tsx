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

interface DocumentType {
  _id: Id<"documentTypes">
  _creationTime: number
  name: string
  code: string
  category: string
  description: string
  isActive: boolean
}

interface DocumentTypesTableProps {
  documentTypes: DocumentType[]
  onEdit: (id: Id<"documentTypes">) => void
  onDelete: (id: Id<"documentTypes">) => void
  onCreateNew: () => void
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Identity: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    Work: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Education: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    Financial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    Legal: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    Other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  }
  return colors[category] || colors.Other
}

export function DocumentTypesTable({
  documentTypes,
  onEdit,
  onDelete,
  onCreateNew
}: DocumentTypesTableProps) {
  const t = useTranslations('DocumentTypes')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const columns = useMemo<ColumnDef<DocumentType>[]>(
    () => [
      createSelectColumn<DocumentType>(),
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
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('code')} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-muted-foreground">{row.original.code}</span>
        ),
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('category')} />
        ),
        cell: ({ row }) => {
          const category = row.original.category
          return (
            <Badge className={getCategoryColor(category)} variant="outline">
              {t(`category${category}` as any)}
            </Badge>
          )
        },
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('description')} />
        ),
        cell: ({ row }) => {
          const description = row.original.description
          const truncated =
            description.length > 60
              ? description.substring(0, 60) + "..."
              : description
          return <span className="text-sm text-muted-foreground">{truncated}</span>
        },
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('isActive')} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? tCommon('active') : tCommon('inactive')}
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
              {
                label: tCommon('edit'),
                icon: <Edit className="h-4 w-4" />,
                onClick: () => onEdit(row.original._id),
                variant: "default",
              },
              {
                label: tCommon('delete'),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => onDelete(row.original._id),
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
    [t, tCommon, onEdit, onDelete]
  )

  const table = useReactTable({
    data: documentTypes,
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
      recordCount={documentTypes.length}
      emptyMessage={t('noResults')}
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
              {t('createTitle')}
            </Button>
          </div>
        </div>
        <DataGridBulkActions
          table={table}
          actions={[
            {
              label: tCommon('deleteSelected'),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: async (selectedRows) => {
                if (window.confirm(tCommon('bulkDeleteConfirm', { count: selectedRows.length }))) {
                  for (const row of selectedRows) {
                    await onDelete(row._id)
                  }
                  table.resetRowSelection()
                }
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
    </DataGrid>
  )
}
