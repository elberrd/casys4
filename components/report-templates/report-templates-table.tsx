"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  RowSelectionState,
} from "@tanstack/react-table";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridFilter } from "@/components/ui/data-grid-filter";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions";
import { DataGridBulkActions } from "@/components/ui/data-grid-bulk-actions";
import { DataGridHighlightedCell } from "@/components/ui/data-grid-highlighted-cell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { createSelectColumn } from "@/lib/data-grid-utils";
import { globalFuzzyFilter } from "@/lib/fuzzy-search";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation";

export interface ReportTemplateListItem {
  _id: Id<"reportTemplates">;
  name: string;
  description?: string;
  isActive: boolean;
  documentTypes: Array<{ _id: Id<"documentTypes">; name: string }>;
}

interface ReportTemplatesTableProps {
  templates: ReportTemplateListItem[];
  onEdit: (id: Id<"reportTemplates">) => void;
  onDelete: (id: Id<"reportTemplates">) => Promise<void>;
}

export function ReportTemplatesTable({
  templates,
  onEdit,
  onDelete,
}: ReportTemplatesTableProps) {
  const t = useTranslations("ReportTemplates");
  const tCommon = useTranslations("Common");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"reportTemplates">) => {
      await onDelete(id);
    },
    entityName: t("entityName"),
  });

  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: ReportTemplateListItem) => {
      await onDelete(item._id);
    },
    onSuccess: () => {
      setRowSelection({});
    },
  });

  const columns = useMemo<ColumnDef<ReportTemplateListItem>[]>(
    () => [
      createSelectColumn<ReportTemplateListItem>(),
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
        accessorKey: "documentTypes",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("linkedDocumentTypes")} />
        ),
        cell: ({ row }) => {
          const documentTypes = row.original.documentTypes;
          if (documentTypes.length === 0) {
            return <span className="text-muted-foreground">{t("noLinkedTypes")}</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {documentTypes.map((documentType) => (
                <Badge key={documentType._id} variant="outline">
                  {documentType.name}
                </Badge>
              ))}
            </div>
          );
        },
        enableSorting: false,
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
                variant: "default",
              },
              {
                label: tCommon("delete"),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () =>
                  deleteConfirmation.confirmDelete(row.original._id),
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
    [t, tCommon, onEdit, deleteConfirmation],
  );

  const table = useReactTable({
    data: templates,
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
  });

  return (
    <DataGrid
      table={table}
      recordCount={templates.length}
      emptyMessage={t("noResults")}
      onRowClick={(row) => onEdit(row._id)}
      tableLayout={{
        columnsVisibility: true,
      }}
    >
      <div className="w-full space-y-2.5">
        <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
          <DataGridFilter table={table} className="w-full sm:max-w-sm" />
          <DataGridColumnVisibility
            table={table}
            trigger={
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                {tCommon("columns")}
              </Button>
            }
          />
        </div>
        <DataGridBulkActions
          table={table}
          actions={[
            {
              label: tCommon("deleteSelected"),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: (selectedRows) => {
                bulkDeleteConfirmation.confirmBulkDelete(selectedRows);
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
    </DataGrid>
  );
}
