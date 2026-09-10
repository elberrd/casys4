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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"

interface CompanyGroup {
  _id: Id<"companyGroups">
  name: string
  description?: string
  isActive: boolean
}

interface CompanyGroupsTableProps {
  companyGroups: CompanyGroup[]
  onEdit: (id: Id<"companyGroups">) => void
  onDelete: (id: Id<"companyGroups">) => void
}

export function CompanyGroupsTable({
  companyGroups,
  onEdit,
  onDelete,
}: CompanyGroupsTableProps) {
  const t = useTranslations("CompanyGroups")
  const tCommon = useTranslations("Common")
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"companyGroups">) => {
      if (onDelete) await onDelete(id)
    },
    entityName: "company group",
  })

  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (group: CompanyGroup) => {
      await onDelete(group._id)
    },
    onSuccess: () => {
      setRowSelection({})
    },
  })

  const columns = useMemo<ColumnDef<CompanyGroup>[]>(
    () => [
      createSelectColumn<CompanyGroup>(),
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("name")} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.name} />
        ),
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("descriptionLabel")} />
        ),
        cell: ({ row }) => {
          const description = row.original.description
          if (!description) return <span className="text-muted-foreground">-</span>

          const truncated = description.length > 60
            ? `${description.substring(0, 60)}...`
            : description

          return (
            <div title={description}>
              <DataGridHighlightedCell text={truncated} />
            </div>
          )
        },
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("isActive")} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? tCommon("active") : tCommon("inactive")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) => (
          <DataGridRowActions
            actions={[
              {
                label: tCommon("edit"),
                icon: <Edit className="h-4 w-4" />,
                onClick: () => onEdit(row.original._id),
                variant: "default" as const,
              },
              {
                label: tCommon("delete"),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => deleteConfirmation.confirmDelete(row.original._id),
                variant: "destructive" as const,
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
    [t, tCommon, onEdit, onDelete, deleteConfirmation]
  )

  const table = useReactTable({
    data: companyGroups,
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
      sorting: [
        {
          id: "name",
          desc: false,
        },
      ],
    },
    state: {
      rowSelection,
    },
  })

  return (
    <DataGrid
      table={table}
      recordCount={companyGroups.length}
      emptyMessage={t("noResults")}
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
        <DataGridBulkActions
          table={table}
          actions={[
            {
              label: tCommon("deleteSelected"),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: (selectedRows) => {
                bulkDeleteConfirmation.confirmBulkDelete(selectedRows)
              },
              variant: "destructive",
            },
          ]}
        />
        <DataGridContainer>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>
        <DataGridPagination />
      </div>

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={deleteConfirmation.handleCancel}
        onConfirm={deleteConfirmation.handleConfirm}
        entityName="company group"
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
