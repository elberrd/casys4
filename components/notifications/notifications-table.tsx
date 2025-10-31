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
import { Eye, Trash2, CheckCircle, Bell, FileCheck, ListTodo, AlertCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { useLocale } from "next-intl"

interface Notification {
  _id: Id<"notifications">
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: number
  entityType?: string
  entityId?: string
}

interface NotificationsTableProps {
  notifications: Notification[]
  onView?: (id: Id<"notifications">) => void
  onDelete?: (id: Id<"notifications">) => void
  onMarkAsRead?: (id: Id<"notifications">) => void
  onMarkAsUnread?: (id: Id<"notifications">) => void
  onBulkDelete?: (ids: Id<"notifications">[]) => void
  onBulkMarkAsRead?: (ids: Id<"notifications">[]) => void
}

const notificationIcons = {
  status_change: CheckCircle,
  document_approved: FileCheck,
  document_rejected: AlertCircle,
  task_assigned: ListTodo,
  process_milestone: Bell,
  default: Bell,
}

export function NotificationsTable({
  notifications,
  onView,
  onDelete,
  onMarkAsRead,
  onMarkAsUnread,
  onBulkDelete,
  onBulkMarkAsRead,
}: NotificationsTableProps) {
  const t = useTranslations("Notifications")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"notifications">) => {
      await onDelete?.(id)
    },
    entityName: t("entityName"),
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: Notification) => {
      await onDelete?.(item._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

  const dateLocale = locale === "pt" ? ptBR : enUS

  const columns = useMemo<ColumnDef<Notification>[]>(
    () => [
      createSelectColumn<Notification>(),
      {
        accessorKey: "type",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("type")} />
        ),
        cell: ({ row }) => {
          const Icon =
            notificationIcons[row.original.type as keyof typeof notificationIcons] ||
            notificationIcons.default
          return (
            <div className="flex items-center gap-2">
              <div
                className={
                  row.original.isRead
                    ? "rounded-full bg-muted p-1.5 text-muted-foreground"
                    : "rounded-full bg-primary/10 p-1.5 text-primary"
                }
              >
                <Icon className="h-3 w-3" />
              </div>
              <span className="text-sm">{t(`types.${row.original.type}`)}</span>
            </div>
          )
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("title")} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <DataGridHighlightedCell text={row.original.title} />
            {!row.original.isRead && (
              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
        ),
      },
      {
        accessorKey: "message",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("message")} />
        ),
        cell: ({ row }) => (
          <div className="max-w-md truncate text-sm text-muted-foreground">
            {row.original.message}
          </div>
        ),
      },
      {
        accessorKey: "isRead",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isRead ? "secondary" : "default"}>
            {row.original.isRead ? t("read") : t("unread")}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          if (value === "all") return true
          if (value === "unread") return !row.original.isRead
          if (value === "read") return row.original.isRead
          return true
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("createdAt")} />
        ),
        cell: ({ row }) => {
          const timeAgo = formatDistanceToNow(new Date(row.original.createdAt), {
            addSuffix: true,
            locale: dateLocale,
          })
          return <div className="text-sm text-muted-foreground">{timeAgo}</div>
        },
        sortingFn: "datetime",
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const actions = [
            ...(onView
              ? [
                  {
                    label: tCommon("view"),
                    icon: <Eye className="h-4 w-4" />,
                    onClick: () => onView(row.original._id),
                  },
                ]
              : []),
            ...(row.original.isRead && onMarkAsUnread
              ? [
                  {
                    label: t("markAsUnread"),
                    icon: <Bell className="h-4 w-4" />,
                    onClick: () => onMarkAsUnread(row.original._id),
                  },
                ]
              : []),
            ...(!row.original.isRead && onMarkAsRead
              ? [
                  {
                    label: t("markAsRead"),
                    icon: <CheckCircle className="h-4 w-4" />,
                    onClick: () => onMarkAsRead(row.original._id),
                  },
                ]
              : []),
            ...(onDelete
              ? [
                  {
                    label: tCommon("delete"),
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: () => deleteConfirmation.confirmDelete(row.original._id),
                    variant: "destructive" as const,
                  },
                ]
              : []),
          ]

          return <DataGridRowActions actions={actions} />
        },
      },
    ],
    [t, tCommon, onView, onDelete, onMarkAsRead, onMarkAsUnread, dateLocale]
  )

  const table = useReactTable({
    data: notifications,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize: 20,
      },
      sorting: [
        {
          id: "createdAt",
          desc: true,
        },
      ],
    },
    state: {
      rowSelection,
    },
    globalFilterFn: globalFuzzyFilter,
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedIds = selectedRows.map((row) => row.original._id)

  const bulkActions = [
    ...(onBulkMarkAsRead
      ? [
          {
            label: t("markAllAsRead"),
            icon: <CheckCircle className="h-4 w-4" />,
            onClick: () => onBulkMarkAsRead(selectedIds),
          },
        ]
      : []),
    ...(onBulkDelete
      ? [
          {
            label: tCommon("deleteSelected"),
            icon: Trash2,
            onClick: () => onBulkDelete(selectedIds),
            variant: "destructive" as const,
          },
        ]
      : []),
  ]

  const typeFilters = [
    { label: t("types.all"), value: "all" },
    { label: t("types.status_change"), value: "status_change" },
    { label: t("types.document_approved"), value: "document_approved" },
    { label: t("types.document_rejected"), value: "document_rejected" },
    { label: t("types.task_assigned"), value: "task_assigned" },
    { label: t("types.process_milestone"), value: "process_milestone" },
  ]

  const statusFilters = [
    { label: t("all"), value: "all" },
    { label: t("unread"), value: "unread" },
    { label: t("read"), value: "read" },
  ]

  return (
    <>
      <DataGrid
        table={table}
        recordCount={notifications.length}
        emptyMessage={t("noResults")}
        onRowClick={onView ? (row) => onView(row._id) : undefined}
      >
        <DataGridContainer>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <DataGridPagination />
        </DataGridContainer>
      </DataGrid>

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={deleteConfirmation.handleCancel}
        onConfirm={deleteConfirmation.handleConfirm}
        entityName={t("entityName")}
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
    </>
  )
}
