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

interface City {
  _id: Id<"cities">
  name: string
  stateId: Id<"states">
  hasFederalPolice: boolean
  state: {
    _id: Id<"states">
    name: string
    code: string
    countryId: Id<"countries">
  } | null
  country: {
    _id: Id<"countries">
    name: string
    code: string
    iso3: string
  } | null
}

interface CitiesTableProps {
  cities: City[]
  onEdit: (id: Id<"cities">) => void
  onDelete: (id: Id<"cities">) => void
}

export function CitiesTable({ cities, onEdit, onDelete }: CitiesTableProps) {
  const t = useTranslations('Cities')
  const tCommon = useTranslations('Common')

  const columns = useMemo<ColumnDef<City>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('name')} />
        ),
      },
      {
        accessorKey: "state.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('state')} />
        ),
        cell: ({ row }) => row.original.state?.name || "-",
      },
      {
        accessorKey: "country.name",
        header: "Country",
        cell: ({ row }) => row.original.country?.name || "-",
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
    data: cities,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <DataGrid
      table={table}
      recordCount={cities.length}
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
