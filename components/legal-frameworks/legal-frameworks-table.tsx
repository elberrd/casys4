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

interface LegalFramework {
  _id: Id<"legalFrameworks">
  name: string
  code: string
  description: string
  isActive: boolean
}

interface LegalFrameworksTableProps {
  legalFrameworks: LegalFramework[]
  onEdit: (id: Id<"legalFrameworks">) => void
  onDelete: (id: Id<"legalFrameworks">) => void
}

export function LegalFrameworksTable({ legalFrameworks, onEdit, onDelete }: LegalFrameworksTableProps) {
  const t = useTranslations('LegalFrameworks')
  const tCommon = useTranslations('Common')

  const columns = useMemo<ColumnDef<LegalFramework>[]>(
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
        accessorKey: "description",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('description')} />
        ),
        cell: ({ row }) => {
          const desc = row.original.description
          return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc
        },
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
    data: legalFrameworks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <DataGrid
      table={table}
      recordCount={legalFrameworks.length}
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
