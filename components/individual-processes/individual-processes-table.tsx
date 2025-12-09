"use client"

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  RowSelectionState,
  VisibilityState,
  SortingState,
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
import { Edit, Trash2, Eye, ListTodo, FileEdit, RefreshCcw, CalendarClock, Copy } from "lucide-react"
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
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"

interface IndividualProcess {
  _id: Id<"individualProcesses">
  status?: string
  caseStatusId?: Id<"caseStatuses">
  isActive?: boolean
  processStatus?: "Atual" | "Anterior"
  activeStatus?: {
    _id: Id<"individualProcessStatuses">
    statusName: string
    isActive: boolean
    changedAt: number
    date?: string
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
  collectiveProcess?: {
    _id: Id<"collectiveProcesses">
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
  rnmDeadline?: string
  deadlineDate?: string
}

interface CandidateFilterOption {
  value: string
  label: string
}

interface IndividualProcessesTableProps {
  individualProcesses: IndividualProcess[]
  onView?: (id: Id<"individualProcesses">) => void
  onEdit?: (id: Id<"individualProcesses">) => void
  onDelete?: (id: Id<"individualProcesses">) => void
  onFillFields?: (individualProcessId: Id<"individualProcesses">, statusId: Id<"individualProcessStatuses">) => void
  onCreateFromExisting?: (id: Id<"individualProcesses">) => void
  onBulkStatusUpdate?: (selected: Array<{ _id: Id<"individualProcesses">; personId: Id<"people">; status?: string }>) => void
  onBulkCreateTask?: (selected: IndividualProcess[]) => void
  onRowClick?: (id: Id<"individualProcesses">) => void
  onUpdateStatus?: (id: Id<"individualProcesses">) => void
  // Candidate filter props
  candidateOptions?: CandidateFilterOption[]
  selectedCandidates?: string[]
  onCandidateFilterChange?: (candidates: string[]) => void
  // RNM mode toggle props
  isRnmModeActive?: boolean
  onRnmModeToggle?: () => void
}

export function IndividualProcessesTable({
  individualProcesses,
  onView,
  onEdit,
  onDelete,
  onFillFields,
  onCreateFromExisting,
  onBulkStatusUpdate,
  onBulkCreateTask,
  onRowClick,
  onUpdateStatus,
  candidateOptions = [],
  selectedCandidates = [],
  onCandidateFilterChange,
  isRnmModeActive = false,
  onRnmModeToggle,
}: IndividualProcessesTableProps) {
  const t = useTranslations('IndividualProcesses')
  const tCommon = useTranslations('Common')
  const locale = useLocale()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    filledFields: false, // Hide the filledFields column by default
    rnmDeadline: false, // Hide the rnmDeadline column by default (controlled by RNM toggle)
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // Use ref to store previous sorting to avoid dependency issues
  const previousSortingRef = useRef<SortingState | null>(null)

  // Handle RNM mode toggle - show/hide column and apply sorting
  useEffect(() => {
    if (isRnmModeActive) {
      // Save current sorting before switching to RNM mode
      previousSortingRef.current = sorting
      // Show rnmDeadline column
      setColumnVisibility(prev => ({ ...prev, rnmDeadline: true }))
      // Apply ascending sort on rnmDeadline (closest deadlines first)
      setSorting([{ id: 'rnmDeadline', desc: false }])
    } else {
      // Hide rnmDeadline column
      setColumnVisibility(prev => ({ ...prev, rnmDeadline: false }))
      // Restore previous sorting
      if (previousSortingRef.current !== null) {
        setSorting(previousSortingRef.current)
        previousSortingRef.current = null
      } else {
        setSorting([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRnmModeActive])

  // Wrap setRowSelection to prevent state updates during render
  const handleRowSelectionChange = useCallback((updaterOrValue: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
    // Defer state update to avoid updating during render
    queueMicrotask(() => {
      setRowSelection(updaterOrValue)
    })
  }, [])

  // Wrap setColumnVisibility to prevent state updates during render
  const handleColumnVisibilityChange = useCallback((updaterOrValue: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
    queueMicrotask(() => {
      setColumnVisibility(updaterOrValue)
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
        accessorKey: "processTypeIndicator",
        id: "processTypeIndicator",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('processTypeIndicator')} />
        ),
        cell: ({ row }) => {
          const isCollective = !!row.original.collectiveProcess
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={isCollective ? "default" : "secondary"}
                    className="w-6 h-6 flex items-center justify-center font-semibold cursor-help"
                  >
                    {isCollective ? "C" : "I"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isCollective ? t('collectiveProcessIndicator') : t('individualProcessIndicator')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
        size: 50,
        enableSorting: true,
        enableHiding: true,
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

          // Format the date - prioritize user-editable date field, fallback to changedAt
          let formattedDate = ""
          if (activeStatus) {
            // Use date field if available, otherwise fallback to changedAt formatted as ISO date
            const displayDate = activeStatus.date || new Date(activeStatus.changedAt).toISOString().split('T')[0]

            // Parse the ISO date string (YYYY-MM-DD) to avoid timezone issues
            const [year, month, day] = displayDate.split('-').map(Number)
            if (year && month && day) {
              const date = new Date(year, month - 1, day)
              if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                })
              }
            }
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
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex flex-col gap-1 items-start">
                {formattedDate && (
                  <span className="text-xs text-muted-foreground">
                    {formattedDate}
                  </span>
                )}
                <StatusBadge
                  status={statusName}
                  type="individual_process"
                  color={caseStatus.color}
                  category={caseStatus.category}
                />
              </div>
              {onUpdateStatus && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdateStatus(row.original._id)
                  }}
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span className="sr-only">{tCommon('updateStatus')}</span>
                </Button>
              )}
            </div>
          )

          // If there's tooltip content, wrap the badge with tooltip and indicator
          if (tooltipContent) {
            return (
              <div className="flex items-center justify-between gap-2 w-full">
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <div className="cursor-help inline-block">
                        <div className="flex flex-col gap-1 items-start">
                          {formattedDate && (
                            <span className="text-xs text-muted-foreground">
                              {formattedDate}
                            </span>
                          )}
                          <div className="relative inline-block">
                            <StatusBadge
                              status={statusName}
                              type="individual_process"
                              color={caseStatus.color}
                              category={caseStatus.category}
                            />
                            {/* Green indicator dot */}
                            <span
                              className="absolute -top-0.5 -right-0.5 flex h-2 w-2"
                              aria-hidden="true"
                            >
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 ring-1 ring-white"></span>
                            </span>
                          </div>
                        </div>
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
                {onUpdateStatus && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateStatus(row.original._id)
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    <span className="sr-only">{tCommon('updateStatus')}</span>
                  </Button>
                )}
              </div>
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
        accessorKey: "processStatus",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('processStatus')} />
        ),
        cell: ({ row }) => {
          // Handle backward compatibility: use processStatus if available, otherwise derive from isActive
          const processStatus = row.original.processStatus || (row.original.isActive === false ? "Anterior" : "Atual")
          return (
            <Badge variant={processStatus === "Atual" ? "default" : "secondary"}>
              {processStatus === "Atual" ? t('processStatusCurrent') : t('processStatusPrevious')}
            </Badge>
          )
        },
      },
      {
        id: "rnmDeadline",
        accessorKey: "rnmDeadline",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('fields.rnmDeadline')} />
        ),
        cell: ({ row }) => {
          const deadline = row.original.rnmDeadline
          if (!deadline) {
            return <span className="text-sm text-muted-foreground">-</span>
          }

          // Parse the ISO date string (YYYY-MM-DD) to avoid timezone issues
          const [year, month, day] = deadline.split('-').map(Number)
          if (!year || !month || !day) {
            return <span className="text-sm text-muted-foreground">-</span>
          }

          const deadlineDate = new Date(year, month - 1, day)
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          // Calculate days until deadline
          const diffTime = deadlineDate.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          // Format the date
          const formattedDate = deadlineDate.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          })

          // Determine the urgency color
          let badgeVariant: "destructive" | "warning" | "default" | "secondary" = "secondary"
          let urgencyText = ""

          if (diffDays < 0) {
            badgeVariant = "destructive"
            urgencyText = t('rnmExpired')
          } else if (diffDays === 0) {
            badgeVariant = "destructive"
            urgencyText = t('rnmToday')
          } else if (diffDays <= 30) {
            badgeVariant = "destructive"
            urgencyText = `${diffDays} ${tCommon('days')}`
          } else if (diffDays <= 90) {
            badgeVariant = "warning"
            urgencyText = `${diffDays} ${tCommon('days')}`
          } else {
            badgeVariant = "default"
            urgencyText = `${diffDays} ${tCommon('days')}`
          }

          return (
            <div className="flex flex-col gap-1">
              <span className="text-sm">{formattedDate}</span>
              <Badge variant={badgeVariant} className={`text-xs w-fit ${badgeVariant === "destructive" ? "text-white" : ""}`}>
                {urgencyText}
              </Badge>
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const dateA = rowA.original.rnmDeadline
          const dateB = rowB.original.rnmDeadline

          // Handle null/undefined cases - put them at the end
          if (!dateA && !dateB) return 0
          if (!dateA) return 1 // A goes after B
          if (!dateB) return -1 // B goes after A

          // Compare dates (ISO format allows string comparison)
          return dateA.localeCompare(dateB)
        },
        enableHiding: true,
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

          // Add Create from Existing button
          if (onCreateFromExisting) {
            actions.push({
              label: t('createFromExisting'),
              icon: <Copy className="h-4 w-4" />,
              onClick: () => onCreateFromExisting(row.original._id),
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
    [t, tCommon, locale, onView, onEdit, onFillFields, onCreateFromExisting, onDelete, confirmDelete, onUpdateStatus]
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
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onSortingChange: setSorting,
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    state: {
      rowSelection,
      columnVisibility,
      sorting,
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <DataGridFilter table={table} className="w-full sm:max-w-sm" />
            {onCandidateFilterChange && candidateOptions.length > 0 && (
              <Combobox
                multiple
                options={candidateOptions as ComboboxOption<string>[]}
                value={selectedCandidates}
                onValueChange={onCandidateFilterChange}
                placeholder={t('filters.selectCandidates')}
                searchPlaceholder={t('filters.searchCandidates')}
                emptyText={t('filters.noCandidatesFound')}
                triggerClassName="w-full sm:w-[280px] min-h-10"
                showClearButton={true}
                clearButtonAriaLabel={t('filters.clearCandidates')}
              />
            )}
            {onRnmModeToggle && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isRnmModeActive ? "default" : "outline"}
                      size="sm"
                      onClick={onRnmModeToggle}
                      className={`min-h-10 gap-2 transition-all duration-200 ${
                        isRnmModeActive
                          ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                          : "hover:border-amber-500 hover:text-amber-600"
                      }`}
                    >
                      <CalendarClock className={`h-4 w-4 ${isRnmModeActive ? "animate-pulse" : ""}`} />
                      <span className="font-medium">RNM</span>
                      {isRnmModeActive && (
                        <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{isRnmModeActive ? t('rnmModeDisable') : t('rnmModeEnable')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
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
