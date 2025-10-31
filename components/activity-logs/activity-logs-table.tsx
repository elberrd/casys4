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
import { Badge } from "@/components/ui/badge"
import { Eye, FileText, CheckCircle, Trash2, Edit, Plus, UserPlus, Calendar } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { useLocale } from "next-intl"

interface ActivityLog {
  _id: Id<"activityLogs">
  userId: Id<"users">
  action: string
  entityType: string
  entityId: string
  details?: any
  ipAddress?: string
  userAgent?: string
  createdAt: number
  user: {
    _id: string
    fullName: string
    email: string
  } | null
}

interface ActivityLogsTableProps {
  logs: ActivityLog[]
  onViewDetails?: (log: ActivityLog) => void
}

export function ActivityLogsTable({
  logs,
  onViewDetails,
}: ActivityLogsTableProps) {
  const t = useTranslations('ActivityLogs')
  const tCommon = useTranslations('Common')
  const locale = useLocale()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Helper to get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <Plus className="h-4 w-4" />
      case "updated":
        return <Edit className="h-4 w-4" />
      case "deleted":
        return <Trash2 className="h-4 w-4" />
      case "approved":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
        return <Trash2 className="h-4 w-4" />
      case "assigned":
      case "reassigned":
        return <UserPlus className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "status_changed":
        return <Calendar className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Helper to get action badge variant
  const getActionVariant = (action: string) => {
    switch (action) {
      case "created":
        return "default"
      case "updated":
        return "secondary"
      case "deleted":
        return "destructive"
      case "approved":
        return "default"
      case "rejected":
        return "destructive"
      default:
        return "outline"
    }
  }

  // Helper to format entity type
  const formatEntityType = (entityType: string) => {
    return t(`entityTypes.${entityType}`, { defaultValue: entityType })
  }

  // Helper to format action
  const formatAction = (action: string) => {
    return t(`actions.${action}`, { defaultValue: action })
  }

  const columns: ColumnDef<ActivityLog>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('timestamp')} />
        ),
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt)
          const dateLocale = locale === "pt" ? ptBR : enUS
          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {date.toLocaleString(locale === "pt" ? "pt-BR" : "en-US")}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: "user",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('user')} />
        ),
        cell: ({ row }) => {
          const user = row.original.user
          return user ? (
            <div className="flex flex-col">
              <span className="font-medium">{user.fullName}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{tCommon('unknown')}</span>
          )
        },
      },
      {
        accessorKey: "action",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('action')} />
        ),
        cell: ({ row }) => {
          const action = row.original.action
          return (
            <Badge variant={getActionVariant(action) as any} className="gap-1">
              {getActionIcon(action)}
              {formatAction(action)}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: "entityType",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('entityType')} />
        ),
        cell: ({ row }) => (
          <span className="capitalize">{formatEntityType(row.getValue("entityType"))}</span>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: "entityId",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('entityId')} />
        ),
        cell: ({ row }) => (
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            {row.getValue("entityId")}
          </code>
        ),
      },
      {
        accessorKey: "ipAddress",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('ipAddress')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.ipAddress || "N/A"}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const actions = [
            {
              label: t('viewDetails'),
              icon: <Eye className="h-4 w-4 mr-2" />,
              onClick: () => onViewDetails?.(row.original),
            },
          ]

          return (
            <DataGridRowActions
              actions={actions}
            />
          )
        },
      },
    ],
    [t, tCommon, locale, onViewDetails]
  )

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    state: {
      rowSelection,
    },
    globalFilterFn: globalFuzzyFilter,
  })

  return (
    <DataGridContainer>
      <DataGrid table={table} recordCount={logs.length} onRowClick={onViewDetails ? (row) => onViewDetails(row) : undefined}>
        <DataGridFilter
          table={table}
          placeholder={t('searchPlaceholder')}
        />
        <ScrollArea className="h-[600px] rounded-md border">
          <DataGridTable />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <DataGridPagination />
      </DataGrid>
    </DataGridContainer>
  )
}
