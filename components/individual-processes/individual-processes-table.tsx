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
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions"
import { DataGridBulkActions } from "@/components/ui/data-grid-bulk-actions"
import { DataGridHighlightedCell } from "@/components/ui/data-grid-highlighted-cell"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Eye } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"

interface IndividualProcess {
  _id: Id<"individualProcesses">
  status: string
  isActive: boolean
  person?: {
    _id: Id<"people">
    fullName: string
    email: string
  } | null
  mainProcess?: {
    _id: Id<"mainProcesses">
    referenceNumber: string
  } | null
  legalFramework?: {
    _id: Id<"legalFrameworks">
    name: string
  } | null
  protocolNumber?: string
  rnmNumber?: string
  deadlineDate?: string
}

interface IndividualProcessesTableProps {
  individualProcesses: IndividualProcess[]
  onView?: (id: Id<"individualProcesses">) => void
  onEdit?: (id: Id<"individualProcesses">) => void
  onDelete?: (id: Id<"individualProcesses">) => void
}

export function IndividualProcessesTable({
  individualProcesses,
  onView,
  onEdit,
  onDelete
}: IndividualProcessesTableProps) {
  const t = useTranslations('IndividualProcesses')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const columns = useMemo<ColumnDef<IndividualProcess>[]>(
    () => [
      createSelectColumn<IndividualProcess>(),
      {
        accessorKey: "person.fullName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('personName')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.person?.fullName || "-"} />
        ),
      },
      {
        accessorKey: "mainProcess.referenceNumber",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('referenceNumber')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.mainProcess?.referenceNumber || "-"} />
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('status')} />
        ),
        cell: ({ row }) => {
          const status = row.original.status
          const variant = status === "completed"
            ? "default"
            : status === "in_progress"
            ? "secondary"
            : "outline"

          return (
            <Badge variant={variant}>
              {status}
            </Badge>
          )
        },
      },
      {
        accessorKey: "legalFramework.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('legalFramework')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.legalFramework?.name || "-"}
          </span>
        ),
      },
      {
        accessorKey: "protocolNumber",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('protocolNumber')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-mono">
            {row.original.protocolNumber || "-"}
          </span>
        ),
      },
      {
        accessorKey: "rnmNumber",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('rnmNumber')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-mono">
            {row.original.rnmNumber || "-"}
          </span>
        ),
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
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{tCommon('actions')}</span>,
        cell: ({ row }) => {
          const actions = []

          if (onView) {
            actions.push({
              label: tCommon('view'),
              icon: <Eye className="h-4 w-4" />,
              onClick: () => onView(row.original._id),
              variant: "default" as const,
            })
          }

          if (onEdit) {
            actions.push({
              label: tCommon('edit'),
              icon: <Edit className="h-4 w-4" />,
              onClick: () => onEdit(row.original._id),
              variant: "default" as const,
            })
          }

          if (onDelete) {
            actions.push({
              label: tCommon('delete'),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => onDelete(row.original._id),
              variant: "destructive" as const,
              separator: true,
            })
          }

          return <DataGridRowActions actions={actions} />
        },
        size: 50,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, tCommon, onView, onEdit, onDelete]
  )

  const table = useReactTable({
    data: individualProcesses,
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
      recordCount={individualProcesses.length}
      emptyMessage={t('noResults')}
    >
      <div className="w-full space-y-2.5">
        <DataGridFilter table={table} className="w-full sm:max-w-sm" />
        {onDelete && (
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
        )}
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
