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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Edit, Trash2, Eye, AlertCircle } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"

interface MainProcess {
  _id: Id<"mainProcesses">
  referenceNumber: string
  status: string // DEPRECATED: Kept for backward compatibility
  isUrgent?: boolean
  requestDate?: string
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
  // NEW: Calculated status from individual processes
  calculatedStatus?: {
    displayText: string
    displayTextEn: string
    breakdown: Array<{
      caseStatusId: string
      caseStatusName: string
      caseStatusNameEn?: string
      count: number
      color?: string
      category?: string
    }>
    totalProcesses: number
    hasMultipleStatuses: boolean
  }
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
  const locale = useLocale()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"mainProcesses">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "main process",
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: MainProcess) => {
      if (onDelete) await onDelete(item._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

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
        cell: ({ row }) => {
          const mainProcess = row.original

          // Display calculated status if available
          if (mainProcess.calculatedStatus) {
            const status = mainProcess.calculatedStatus
            const displayText = locale === 'en'
              ? status.displayTextEn
              : status.displayText

            // If only one status, show simple badge
            if (!status.hasMultipleStatuses) {
              const statusItem = status.breakdown[0]
              return (
                <Badge
                  variant="secondary"
                  style={statusItem?.color ? {
                    backgroundColor: `${statusItem.color}20`,
                    color: statusItem.color,
                    borderColor: statusItem.color
                  } : undefined}
                >
                  {displayText}
                </Badge>
              )
            }

            // Multiple statuses: show summary with tooltip
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <Badge variant="secondary" className="truncate max-w-[200px]">
                        {displayText}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold text-xs">
                        {t('statusBreakdown')}:
                      </p>
                      <div className="space-y-1">
                        {status.breakdown.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                            <span>
                              {locale === 'en' && item.caseStatusNameEn
                                ? item.caseStatusNameEn
                                : item.caseStatusName}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={item.color ? {
                                backgroundColor: `${item.color}20`,
                                color: item.color,
                                borderColor: item.color
                              } : undefined}
                            >
                              {item.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground pt-1 border-t">
                        {t('total')}: {status.totalProcesses}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          }

          // Fallback to old status for backward compatibility
          return (
            <StatusBadge
              status={mainProcess.status}
              type="main_process"
            />
          )
        },
        sortingFn: (rowA, rowB) => {
          // Custom sorting by status category priority
          const statusA = rowA.original.calculatedStatus
          const statusB = rowB.original.calculatedStatus

          if (!statusA && !statusB) return 0
          if (!statusA) return 1
          if (!statusB) return -1

          // Sort by category priority if available
          const categoryPriority: Record<string, number> = {
            'urgent': 0,
            'preparation': 1,
            'in_progress': 2,
            'review': 3,
            'approved': 4,
            'cancelled': 5,
          }

          const catA = statusA.breakdown[0]?.category || 'in_progress'
          const catB = statusB.breakdown[0]?.category || 'in_progress'

          const priorityA = categoryPriority[catA] ?? 99
          const priorityB = categoryPriority[catB] ?? 99

          if (priorityA !== priorityB) {
            return priorityA - priorityB
          }

          // If same category, sort alphabetically by display text
          return (statusA.displayText || '').localeCompare(statusB.displayText || '')
        },
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
      recordCount={mainProcesses.length}
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
        {onDelete && (
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
        entityName="main process"
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
