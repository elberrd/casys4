"use client"

import { useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
} from "@tanstack/react-table"
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid"
import { DataGridTable } from "@/components/ui/data-grid-table"
import { DataGridPagination } from "@/components/ui/data-grid-pagination"
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface ProcessType {
  _id: Id<"processTypes">
  name: string
  code: string
  description: string
  category: string
  estimatedDays: number
  isActive: boolean
  sortOrder: number
}

interface ProcessTypesTableProps {
  processTypes: ProcessType[]
  onEdit: (id: Id<"processTypes">) => void
  onDelete: (id: Id<"processTypes">) => void
}

export function ProcessTypesTable({ processTypes, onEdit, onDelete }: ProcessTypesTableProps) {
  const t = useTranslations('ProcessTypes')
  const tCommon = useTranslations('Common')

  const columns = useMemo<ColumnDef<ProcessType>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('name')} />
        ),
      },
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('code')} />
        ),
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('category')} />
        ),
      },
      {
        accessorKey: "estimatedDays",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('estimatedDays')} />
        ),
        cell: ({ row }) => `${row.original.estimatedDays} days`,
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('isActive')} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: tCommon('edit'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(row.original._id)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(row.original._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, tCommon, onEdit, onDelete]
  )

  const table = useReactTable({
    data: processTypes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <DataGrid
      table={table}
      recordCount={processTypes.length}
      emptyMessage={t('noResults')}
    >
      <DataGridContainer>
        <ScrollArea>
          <DataGridTable />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DataGridContainer>
      <DataGridPagination />
    </DataGrid>
  )
}
