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
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface State {
  _id: Id<"states">
  name: string
  countryId: Id<"countries">
  country: {
    name: string
  } | null
}

interface StatesTableProps {
  states: State[]
  onEdit: (id: Id<"states">) => void
  onDelete: (id: Id<"states">) => void
}

export function StatesTable({ states, onEdit, onDelete }: StatesTableProps) {
  const t = useTranslations('States')
  const tCommon = useTranslations('Common')

  const columns = useMemo<ColumnDef<State>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('name')} />
        ),
      },
      {
        id: "country",
        accessorFn: (row) => row.country?.name,
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('country')} />
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
        enableHiding: false,
      },
    ],
    [t, tCommon, onEdit, onDelete]
  )

  const table = useReactTable({
    data: states,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <DataGrid
      table={table}
      recordCount={states.length}
      emptyMessage={t('noResults')}
      tableLayout={{
        columnsVisibility: true,
      }}
    >
      <div className="w-full space-y-2.5">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{t('title')}</h3>
          <DataGridColumnVisibility
            table={table}
            trigger={<Button variant="outline" size="sm">Columns</Button>}
          />
        </div>
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
