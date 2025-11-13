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
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Eye, ListTodo } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"

interface IndividualProcess {
  _id: Id<"individualProcesses">
  status?: string
  caseStatusId?: Id<"caseStatuses">
  isActive?: boolean
  activeStatus?: {
    _id: Id<"individualProcessStatuses">
    statusName: string
    isActive: boolean
    changedAt: number
  } | null
  caseStatus?: {
    _id: Id<"caseStatuses">
    name: string
    nameEn?: string
    code: string
    color?: string
    category?: string
    sortOrder: number
  } | null
  person?: {
    _id: Id<"people">
    fullName: string
    email?: string
  } | null
  mainProcess?: {
    _id: Id<"mainProcesses">
    referenceNumber: string
  } | null
  legalFramework?: {
    _id: Id<"legalFrameworks">
    name: string
  } | null
  applicant?: {
    _id: Id<"people">
    fullName: string
    company?: {
      _id: Id<"companies">
      name: string
    } | null
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
  onBulkStatusUpdate?: (selected: Array<{ _id: Id<"individualProcesses">; personId: Id<"people">; status?: string }>) => void
  onBulkCreateTask?: (selected: IndividualProcess[]) => void
  onRowClick?: (id: Id<"individualProcesses">) => void
}

export function IndividualProcessesTable({
  individualProcesses,
  onView,
  onEdit,
  onDelete,
  onBulkStatusUpdate,
  onBulkCreateTask,
  onRowClick
}: IndividualProcessesTableProps) {
  const t = useTranslations('IndividualProcesses')
  const tCommon = useTranslations('Common')
  const locale = useLocale()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"individualProcesses">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "individual process",
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: IndividualProcess) => {
      if (onDelete) await onDelete(item._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

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
        accessorKey: "applicant.fullName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('applicant')} className="hidden md:table-cell" />
        ),
        cell: ({ row }) => {
          const applicant = row.original.applicant
          if (!applicant || !applicant.company) {
            return <span className="hidden md:table-cell text-sm text-muted-foreground">-</span>
          }
          return (
            <span className="hidden md:table-cell text-sm">
              {`${applicant.fullName} - ${applicant.company.name}`}
            </span>
          )
        },
        enableHiding: true,
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
        accessorKey: "caseStatus.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('caseStatus')} />
        ),
        cell: ({ row }) => {
          const caseStatus = row.original.caseStatus
          if (!caseStatus) {
            return <span className="text-sm text-muted-foreground">-</span>
          }

          // Use nameEn for English locale, otherwise use name (Portuguese)
          const statusName = locale === "en" && caseStatus.nameEn ? caseStatus.nameEn : caseStatus.name

          return (
            <StatusBadge
              status={statusName}
              type="individual_process"
              color={caseStatus.color}
              category={caseStatus.category}
            />
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
              onClick: () => deleteConfirmation.confirmDelete(row.original._id),
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
    [t, tCommon, locale, onView, onEdit, onDelete, deleteConfirmation.confirmDelete]
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
      recordCount={individualProcesses.length}
      emptyMessage={t('noResults')}
      tableLayout={{
        columnsVisibility: true,
      }}
      onRowClick={onRowClick ? (row) => onRowClick(row._id) : undefined}
    >
      <div className="w-full space-y-2.5">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <DataGridFilter table={table} className="w-full sm:max-w-sm" />
          <DataGridColumnVisibility
            table={table}
            trigger={<Button variant="outline" size="sm" className="w-full sm:w-auto">Columns</Button>}
          />
        </div>
        {(onDelete || onBulkStatusUpdate || onBulkCreateTask) && (
          <DataGridBulkActions
            table={table}
            actions={[
              ...(onBulkCreateTask ? [{
                label: t('createBulkTask'),
                icon: <ListTodo className="h-4 w-4" />,
                onClick: async (selectedRows: IndividualProcess[]) => {
                  onBulkCreateTask(selectedRows)
                },
                variant: "default" as const,
              }] : []),
              ...(onBulkStatusUpdate ? [{
                label: tCommon('updateStatus'),
                icon: <Edit className="h-4 w-4" />,
                onClick: async (selectedRows: IndividualProcess[]) => {
                  const selected = selectedRows.map(row => ({
                    _id: row._id,
                    personId: row.person?._id || ("" as Id<"people">),
                    status: row.activeStatus?.statusName || row.status
                  }))
                  onBulkStatusUpdate(selected)
                },
                variant: "default" as const,
              }] : []),
              ...(onDelete ? [{
                label: tCommon('deleteSelected'),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: (selectedRows: IndividualProcess[]) => {
                bulkDeleteConfirmation.confirmBulkDelete(selectedRows)
              },
                variant: "destructive" as const,
              }] : []),
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

      {/* Delete confirmation dialogs */}
      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={deleteConfirmation.handleCancel}
        onConfirm={deleteConfirmation.handleConfirm}
        entityName="individual process"
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
