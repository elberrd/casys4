"use client"

import React, { useMemo, useState, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  RowSelectionState,
  VisibilityState,
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
import { Edit, Trash2, Eye, ListTodo, FileEdit } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"
import { getFieldMetadata } from "@/lib/individual-process-fields"
import { formatFieldValue, truncateString } from "@/lib/format-field-value"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
    filledFieldsData?: Record<string, any>
  } | null
  caseStatus?: {
    _id: Id<"caseStatuses">
    name: string
    nameEn?: string
    code: string
    color?: string
    category?: string
    sortOrder: number
    fillableFields?: string[]
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
  processType?: {
    _id: Id<"processTypes">
    name: string
    nameEn?: string
  } | null
  companyApplicant?: {
    _id: Id<"companies">
    name: string
  } | null
  userApplicant?: {
    _id: Id<"people">
    fullName: string
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
  onFillFields?: (individualProcessId: Id<"individualProcesses">, statusId: Id<"individualProcessStatuses">) => void
  onBulkStatusUpdate?: (selected: Array<{ _id: Id<"individualProcesses">; personId: Id<"people">; status?: string }>) => void
  onBulkCreateTask?: (selected: IndividualProcess[]) => void
  onRowClick?: (id: Id<"individualProcesses">) => void
}

export function IndividualProcessesTable({
  individualProcesses,
  onView,
  onEdit,
  onDelete,
  onFillFields,
  onBulkStatusUpdate,
  onBulkCreateTask,
  onRowClick
}: IndividualProcessesTableProps) {
  const t = useTranslations('IndividualProcesses')
  const tCommon = useTranslations('Common')
  const locale = useLocale()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    filledFields: false, // Hide the filledFields column by default
  })

  // Wrap setRowSelection to prevent state updates during render
  const handleRowSelectionChange = useCallback((updaterOrValue: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
    // Defer state update to avoid updating during render
    queueMicrotask(() => {
      setRowSelection(updaterOrValue)
    })
  }, [])

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"individualProcesses">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "individual process",
  })

  // Destructure to get stable function references
  const { confirmDelete } = deleteConfirmation

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: IndividualProcess) => {
      if (onDelete) await onDelete(item._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

  // Destructure to get stable function reference
  const { confirmBulkDelete } = bulkDeleteConfirmation

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
        accessorKey: "companyApplicant.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('applicant')} className="hidden md:table-cell" />
        ),
        cell: ({ row }) => {
          const { companyApplicant } = row.original
          if (!companyApplicant) {
            return <span className="hidden md:table-cell text-sm text-muted-foreground">-</span>
          }
          return (
            <span className="hidden md:table-cell text-sm">
              {companyApplicant.name}
            </span>
          )
        },
        enableHiding: true,
      },
      {
        accessorKey: "processType.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('processType')} />
        ),
        cell: ({ row }) => {
          const processType = row.original.processType
          if (!processType) {
            return <span className="text-sm text-muted-foreground">-</span>
          }
          // Use nameEn for English locale, otherwise use name (Portuguese)
          const typeName = locale === "en" && processType.nameEn ? processType.nameEn : processType.name
          return <span className="text-sm">{typeName}</span>
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
        accessorKey: "caseStatus.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('caseStatus')} />
        ),
        cell: ({ row }) => {
          const caseStatus = row.original.caseStatus
          const activeStatus = row.original.activeStatus
          
          if (!caseStatus) {
            return <span className="text-sm text-muted-foreground">-</span>
          }

          // Use nameEn for English locale, otherwise use name (Portuguese)
          const statusName = locale === "en" && caseStatus.nameEn ? caseStatus.nameEn : caseStatus.name

          // Format the date from activeStatus.changedAt
          let formattedDate = ""
          if (activeStatus?.changedAt) {
            const date = new Date(activeStatus.changedAt)
            formattedDate = date.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            })
          }

          // Get filled fields data for tooltip
          const filledFieldsData = activeStatus?.filledFieldsData
          const fillableFields = caseStatus.fillableFields

          // Check if there are filled fields to show in tooltip
          const hasFilledFields = filledFieldsData && fillableFields && fillableFields.length > 0 && Object.keys(filledFieldsData).length > 0
          
          let tooltipContent = null
          if (hasFilledFields) {
            const entries = Object.entries(filledFieldsData).filter(([key]) => fillableFields.includes(key))
            
            if (entries.length > 0) {
              const summaryLines = entries.map(([fieldName, value]) => {
                const metadata = getFieldMetadata(fieldName)
                if (!metadata) return null

                const label = t(`fields.${fieldName}` as any)
                const formattedValue = formatFieldValue(value, metadata.fieldType, locale)

                return `${label}: ${formattedValue}`
              }).filter(Boolean)

              if (summaryLines.length > 0) {
                tooltipContent = summaryLines.join('\n')
              }
            }
          }

          const badgeElement = (
            <div className="flex flex-col gap-1 items-start">
              <StatusBadge
                status={statusName}
                type="individual_process"
                color={caseStatus.color}
                category={caseStatus.category}
              />
              {formattedDate && (
                <span className="text-xs text-muted-foreground">
                  {formattedDate}
                </span>
              )}
            </div>
          )

          // If there's tooltip content, wrap the badge with tooltip and indicator
          if (tooltipContent) {
            return (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div className="cursor-help inline-block relative">
                      {badgeElement}
                      {/* Green indicator dot */}
                      <span 
                        className="absolute -top-0.5 -right-0.5 flex h-2 w-2"
                        aria-hidden="true"
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 ring-1 ring-white"></span>
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right" 
                    align="start"
                    className="max-w-sm bg-popover text-popover-foreground border shadow-md"
                  >
                    <div className="space-y-1.5 text-sm">
                      <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                        {t('filledFields')}
                      </div>
                      {tooltipContent.split('\n').map((line, idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="font-medium">{line.split(':')[0]}:</span>
                          <span className="text-muted-foreground ml-2">{line.split(':').slice(1).join(':')}</span>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          }

          return badgeElement
        },
      },
      {
        id: "filledFields",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('filledFields')} />
        ),
        cell: ({ row }) => {
          const filledFieldsData = row.original.activeStatus?.filledFieldsData
          const fillableFields = row.original.caseStatus?.fillableFields

          // If no filled fields data, show empty state
          if (!filledFieldsData || !fillableFields || fillableFields.length === 0 || Object.keys(filledFieldsData).length === 0) {
            return <span className="text-sm text-muted-foreground italic">{t('noFieldsFilled')}</span>
          }

          // Get field metadata for the filled fields
          const entries = Object.entries(filledFieldsData).filter(([key]) => fillableFields.includes(key))

          if (entries.length === 0) {
            return <span className="text-sm text-muted-foreground italic">{t('noFieldsFilled')}</span>
          }

          // Build summary text
          const summaryLines = entries.map(([fieldName, value]) => {
            const metadata = getFieldMetadata(fieldName)
            if (!metadata) return null

            const label = t(`fields.${fieldName}` as any)
            const formattedValue = formatFieldValue(value, metadata.fieldType, locale)

            return `${label}: ${formattedValue}`
          }).filter(Boolean)

          const fullText = summaryLines.join('\n')
          const truncatedText = summaryLines.map(line => truncateString(line || "", 40)).join(', ')

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm max-w-[200px]">
                    {summaryLines.map((line, idx) => (
                      <div key={idx} className="truncate">
                        <span className="font-semibold">{line?.split(':')[0]}</span>
                        {line?.split(':')[1] && <span>: {line.split(':')[1]}</span>}
                      </div>
                    ))}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="whitespace-pre-wrap">{fullText}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
        enableSorting: false,
        enableHiding: true,
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

          // Add Fill Fields button if the caseStatus has fillable fields and activeStatus exists
          if (onFillFields && row.original.caseStatus?.fillableFields && row.original.caseStatus.fillableFields.length > 0 && row.original.activeStatus) {
            actions.push({
              label: t('fillFields'),
              icon: <FileEdit className="h-4 w-4" />,
              onClick: () => onFillFields(row.original._id, row.original.activeStatus!._id),
              variant: "default" as const,
            })
          }

          if (onDelete) {
            actions.push({
              label: tCommon('delete'),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => confirmDelete(row.original._id),
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
    [t, tCommon, locale, onView, onEdit, onFillFields, onDelete, confirmDelete]
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
    onRowSelectionChange: handleRowSelectionChange,
    onColumnVisibilityChange: setColumnVisibility,
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    state: {
      rowSelection,
      columnVisibility,
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
                confirmBulkDelete(selectedRows)
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
