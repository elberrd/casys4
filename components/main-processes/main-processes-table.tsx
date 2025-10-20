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
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Eye, AlertCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"

interface MainProcess {
  _id: Id<"mainProcesses">
  referenceNumber: string
  status: string
  isUrgent: boolean
  requestDate: string
  company?: {
    _id: Id<"companies">
    name: string
  } | null
  contactPerson?: {
    _id: Id<"people">
    fullName: string
  } | null
  processType?: {
    _id: Id<"processTypes">
    name: string
  } | null
  workplaceCity?: {
    _id: Id<"cities">
    name: string
  } | null
  individualProcessesCount?: number
  createdAt: number
}

interface MainProcessesTableProps {
  mainProcesses: MainProcess[]
  onView?: (id: Id<"mainProcesses">) => void
  onEdit?: (id: Id<"mainProcesses">) => void
  onDelete?: (id: Id<"mainProcesses">) => void
}

export function MainProcessesTable({
  mainProcesses,
  onView,
  onEdit,
  onDelete
}: MainProcessesTableProps) {
  const t = useTranslations('MainProcesses')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const columns = useMemo<ColumnDef<MainProcess>[]>(
    () => [
      createSelectColumn<MainProcess>(),
      {
        accessorKey: "referenceNumber",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('referenceNumber')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.referenceNumber} />
        ),
      },
      {
        accessorKey: "company.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('company')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.company?.name || "-"} />
        ),
      },
      {
        accessorKey: "processType.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('processType')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.processType?.name || "-"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('status')} />
        ),
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            type="main_process"
          />
        ),
      },
      {
        accessorKey: "individualProcessesCount",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('individualCount')} />
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <Badge variant="outline">
              {row.original.individualProcessesCount ?? 0}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: "isUrgent",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('urgency')} />
        ),
        cell: ({ row }) => (
          row.original.isUrgent ? (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {tCommon('urgent')}
            </Badge>
          ) : (
            <Badge variant="outline">
              {tCommon('normal')}
            </Badge>
          )
        ),
      },
      {
        accessorKey: "requestDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('requestDate')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.requestDate}
          </span>
        ),
      },
      {
        accessorKey: "contactPerson.fullName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('contactPerson')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.contactPerson?.fullName || "-"}
          </span>
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
    data: mainProcesses,
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
      recordCount={mainProcesses.length}
      emptyMessage={t('noResults')}
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
