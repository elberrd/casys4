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
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridFilter } from "@/components/ui/data-grid-filter";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions";
import { DataGridHighlightedCell } from "@/components/ui/data-grid-highlighted-cell";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CboCodeFormDialog } from "./cbo-code-form-dialog";
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation";

type CboCode = {
  _id: Id<"cboCodes">;
  _creationTime: number;
  code: string;
  title: string;
  description: string;
};

export function CboCodesTable() {
  const t = useTranslations("CboCodes");
  const tCommon = useTranslations("Common");

  const cboCodes = useQuery(api.cboCodes.list, {}) ?? [];
  const removeCboCode = useMutation(api.cboCodes.remove);

  const [editingCboCode, setEditingCboCode] = useState<Id<"cboCodes"> | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"cboCodes">) => {
      await removeCboCode({ id })
    },
    entityName: t("entityName"),
    onSuccess: () => {
      toast.success(t("deletedSuccess"));
    },
    onError: (error) => {
      console.error("Error deleting CBO code:", error);
      toast.error(t("errorDelete"));
    },
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: CboCode) => {
      await removeCboCode({ id: item._id })
    },
    onSuccess: (count) => {
      toast.success(tCommon("bulkDeleteSuccess", { count }));
      table.resetRowSelection()
    },
    onError: (error, failedCount) => {
      console.error("Error in bulk delete:", error);
      toast.error(tCommon("bulkDeleteError"));
    },
  });

  const columns = useMemo<ColumnDef<CboCode>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("code")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.code}</span>
        ),
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("title")} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.title} />
        ),
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("description")} />
        ),
        cell: ({ row }) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="max-w-[300px] truncate block cursor-help">
                  {row.original.description}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{row.original.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) => {
          const actions = [
            {
              label: tCommon("edit"),
              icon: <Pencil className="h-4 w-4" />,
              onClick: () => {
                setEditingCboCode(row.original._id);
                setIsFormOpen(true);
              },
              variant: "default" as const,
            },
            {
              label: tCommon("delete"),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => deleteConfirmation.confirmDelete(row.original._id),
              variant: "destructive" as const,
              separator: true,
            },
          ];

          return <DataGridRowActions actions={actions} />;
        },
        size: 50,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, tCommon]
  );

  const table = useReactTable({
    data: cboCodes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: globalFuzzyFilter,
    enableRowSelection: false,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  return (
    <>
      <DataGrid
        table={table}
        recordCount={cboCodes.length}
        emptyMessage={t("noResults")}
        tableLayout={{
          columnsVisibility: true,
        }}
      >
        <div className="w-full space-y-2.5">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
            <DataGridFilter table={table} className="w-full sm:max-w-sm" />
            <div className="flex gap-2">
              <DataGridColumnVisibility
                table={table}
                trigger={<Button variant="outline" size="sm" className="w-full sm:w-auto">Columns</Button>}
              />
              <Button
                onClick={() => {
                  setEditingCboCode(undefined);
                  setIsFormOpen(true);
                }}
                className="w-full sm:w-auto"
              >
                {t("createTitle")}
              </Button>
            </div>
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

      <CboCodeFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        cboCodeId={editingCboCode}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingCboCode(undefined);
        }}
      />

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open) deleteConfirmation.handleCancel();
        }}
        onConfirm={deleteConfirmation.handleConfirm}
        entityName={t("entityName")}
        isDeleting={deleteConfirmation.isDeleting}
      />

      <DeleteConfirmationDialog
        open={bulkDeleteConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open) bulkDeleteConfirmation.handleCancel();
        }}
        onConfirm={bulkDeleteConfirmation.handleConfirm}
        entityName={t("entityName")}
        isDeleting={bulkDeleteConfirmation.isDeleting}
        variant="bulk"
        count={bulkDeleteConfirmation.itemsToDelete.length}
      />
    </>
  );
}
