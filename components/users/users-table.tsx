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
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility"
import { DataGridFilter } from "@/components/ui/data-grid-filter"
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions"
import { DataGridHighlightedCell } from "@/components/ui/data-grid-highlighted-cell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Edit, Trash2, Key, Eye, CheckCircle, XCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"

interface UserProfile {
  _id: Id<"userProfiles">
  userId?: Id<"users">
  email: string
  fullName: string
  role: "admin" | "client"
  companyId?: Id<"companies">
  phoneNumber?: string
  photoUrl?: string
  isActive: boolean
  createdAt: number
  updatedAt: number
  company?: {
    name: string
  } | null
}

interface UsersTableProps {
  users: UserProfile[]
  onView: (id: Id<"userProfiles">) => void
  onEdit: (id: Id<"userProfiles">) => void
  onResetPassword: (id: Id<"userProfiles">) => void
  onActivate: (id: Id<"userProfiles">, isActive: boolean) => void
  onDelete: (id: Id<"userProfiles">) => void
}

export function UsersTable({
  users,
  onView,
  onEdit,
  onResetPassword,
  onActivate,
  onDelete
}: UsersTableProps) {
  const t = useTranslations('Users')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const columns = useMemo<ColumnDef<UserProfile>[]>(
    () => [
      createSelectColumn<UserProfile>(),
      {
        accessorKey: "photoUrl",
        header: () => <span>{t('columns.photo')}</span>,
        cell: ({ row }) => (
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.photoUrl} alt={row.original.fullName} />
            <AvatarFallback>
              {row.original.fullName
                .split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ),
        size: 60,
        enableSorting: false,
      },
      {
        accessorKey: "fullName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('columns.name')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.fullName} />
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('columns.email')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('columns.role')} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
            {row.original.role === "admin" ? t('admin') : t('client')}
          </Badge>
        ),
      },
      {
        id: "company",
        accessorFn: (row) => row.company?.name || '-',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('columns.company')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.company?.name || '-'}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('columns.status')} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "destructive"}>
            {row.original.isActive ? t('active') : t('inactive')}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t('columns.actions')}</span>,
        cell: ({ row }) => (
          <DataGridRowActions
            actions={[
              {
                label: tCommon('view'),
                icon: <Eye className="h-4 w-4" />,
                onClick: () => onView(row.original._id),
                variant: "default",
              },
              {
                label: tCommon('edit'),
                icon: <Edit className="h-4 w-4" />,
                onClick: () => onEdit(row.original._id),
                variant: "default",
              },
              {
                label: t('resetPassword'),
                icon: <Key className="h-4 w-4" />,
                onClick: () => onResetPassword(row.original._id),
                variant: "default",
                separator: true,
              },
              {
                label: row.original.isActive ? t('deactivate') : t('activate'),
                icon: row.original.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
                onClick: () => onActivate(row.original._id, !row.original.isActive),
                variant: "default",
              },
              {
                label: tCommon('delete'),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => onDelete(row.original._id),
                variant: "destructive",
                separator: true,
              },
            ]}
          />
        ),
        size: 50,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, tCommon, onView, onEdit, onResetPassword, onActivate, onDelete]
  )

  const table = useReactTable({
    data: users,
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
      recordCount={users.length}
      emptyMessage={t('noResults')}
      onRowClick={(row) => onView(row._id)}
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
