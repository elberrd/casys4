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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Eye,
  FileText,
  CheckCircle,
  Trash2,
  Edit,
  Plus,
  UserPlus,
  Calendar,
  RefreshCw,
  XCircle,
  Upload,
  Ban,
  Clock,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { useLocale } from "next-intl"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

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
  totalCount?: number
}

export function ActivityLogsTable({
  logs,
  onViewDetails,
  totalCount,
}: ActivityLogsTableProps) {
  const t = useTranslations('ActivityLogs')
  const tCommon = useTranslations('Common')
  const locale = useLocale()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Helper to get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <Plus className="h-3 w-3" />
      case "updated":
        return <Edit className="h-3 w-3" />
      case "deleted":
        return <Trash2 className="h-3 w-3" />
      case "approved":
        return <CheckCircle className="h-3 w-3" />
      case "rejected":
        return <XCircle className="h-3 w-3" />
      case "assigned":
      case "reassigned":
        return <UserPlus className="h-3 w-3" />
      case "completed":
        return <CheckCircle className="h-3 w-3" />
      case "status_changed":
      case "status_added":
        return <RefreshCw className="h-3 w-3" />
      case "uploaded":
        return <Upload className="h-3 w-3" />
      case "cancelled":
        return <XCircle className="h-3 w-3" />
      case "reopened":
        return <RefreshCw className="h-3 w-3" />
      case "deactivated":
        return <Ban className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  // Helper to get action badge variant and style
  const getActionStyle = (action: string): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } => {
    switch (action) {
      case "created":
        return { variant: "default", className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/20" }
      case "updated":
        return { variant: "secondary", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20" }
      case "deleted":
        return { variant: "destructive", className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20 hover:bg-red-500/20" }
      case "approved":
      case "completed":
        return { variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" }
      case "rejected":
      case "cancelled":
        return { variant: "destructive", className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20" }
      case "status_changed":
      case "status_added":
        return { variant: "outline", className: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20" }
      case "assigned":
      case "reassigned":
        return { variant: "outline", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20" }
      case "uploaded":
        return { variant: "outline", className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20" }
      case "deactivated":
        return { variant: "outline", className: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20" }
      default:
        return { variant: "outline", className: "" }
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

  // Helper to get user initials
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
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
            <div className="flex items-center gap-2 min-w-[140px]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  {date.toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {date.toLocaleTimeString(locale === "pt" ? "pt-BR" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} - {formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })}
                </span>
              </div>
            </div>
          )
        },
        size: 180,
      },
      {
        accessorKey: "user",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('user')} />
        ),
        cell: ({ row }) => {
          const user = row.original.user
          return user ? (
            <div className="flex items-center gap-2 min-w-[150px]">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getUserInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate max-w-[120px]">{user.fullName}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] cursor-default">
                        {user.email}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{user.email}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{tCommon('unknown')}</span>
          )
        },
        size: 200,
      },
      {
        accessorKey: "action",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('action')} />
        ),
        cell: ({ row }) => {
          const action = row.original.action
          const style = getActionStyle(action)
          return (
            <Badge
              variant={style.variant}
              className={cn("gap-1.5 font-medium whitespace-nowrap", style.className)}
            >
              {getActionIcon(action)}
              {formatAction(action)}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
        size: 140,
      },
      {
        accessorKey: "entityType",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('entityType')} />
        ),
        cell: ({ row }) => {
          const entityType = row.getValue("entityType") as string
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm capitalize truncate max-w-[150px] block cursor-default">
                    {formatEntityType(entityType)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatEntityType(entityType)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
        size: 150,
      },
      {
        accessorKey: "entityId",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('entityId')} />
        ),
        cell: ({ row }) => {
          const entityId = row.getValue("entityId") as string
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[120px] block cursor-default">
                    {entityId.length > 16 ? `${entityId.slice(0, 8)}...${entityId.slice(-6)}` : entityId}
                  </code>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{entityId}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
        size: 140,
      },
      {
        accessorKey: "ipAddress",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('ipAddress')} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {row.original.ipAddress || "N/A"}
          </span>
        ),
        size: 100,
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
        size: 50,
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
      <DataGrid table={table} recordCount={totalCount || logs.length} onRowClick={onViewDetails ? (row) => onViewDetails(row) : undefined}>
        <DataGridFilter
          table={table}
          placeholder={t('searchPlaceholder')}
        />
        <div className="rounded-md border">
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[400px]">
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        <DataGridPagination />
      </DataGrid>
    </DataGridContainer>
  )
}
