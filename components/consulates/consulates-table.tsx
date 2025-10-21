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
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridFilter } from "@/components/ui/data-grid-filter";
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions";
import { DataGridBulkActions } from "@/components/ui/data-grid-bulk-actions";
import { DataGridHighlightedCell } from "@/components/ui/data-grid-highlighted-cell";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { createSelectColumn } from "@/lib/data-grid-utils";
import { globalFuzzyFilter } from "@/lib/fuzzy-search";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation";
import { ConsulateFormDialog } from "./consulate-form-dialog";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

type Consulate = {
  _id: Id<"consulates">;
  _creationTime: number;
  name: string;
  cityId: Id<"cities">;
  address: string;
  phoneNumber: string;
  email: string;
  website?: string;
  city: { _id: Id<"cities">; name: string } | null;
  state: { _id: Id<"states">; name: string } | null;
  country: { _id: Id<"countries">; name: string } | null;
};

export function ConsulatesTable() {
  const t = useTranslations("Consulates");
  const tCommon = useTranslations("Common");

  const consulates = useQuery(api.consulates.list, {}) ?? [];
  const removeConsulate = useMutation(api.consulates.remove);

  const [editingConsulate, setEditingConsulate] = useState<Id<"consulates"> | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const onEdit = (id: Id<"consulates">) => {
    setEditingConsulate(id);
    setIsFormOpen(true);
  };

  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"consulates">) => {
      await removeConsulate({ id });
    },
    entityName: t("entityName"),
    onSuccess: () => {
      toast.success(t("deletedSuccess"));
    },
    onError: (error) => {
      console.error("Error deleting consulate:", error);
      toast.error(t("errorDelete"));
    },
  });

  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (consulate: Consulate) => {
      await removeConsulate({ id: consulate._id });
    },
    onSuccess: () => {
      toast.success(t("deletedSuccess"));
      table.resetRowSelection();
    },
    onError: (error) => {
      console.error("Error deleting consulates:", error);
      toast.error(t("errorDelete"));
    },
  });

  const columns = useMemo<ColumnDef<Consulate>[]>(
    () => [
      createSelectColumn<Consulate>(),
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
        id: "location",
        header: () => t("location"),
        cell: ({ row }) => {
          const city = row.original.city?.name || "";
          const state = row.original.state?.name || "";
          const country = row.original.country?.name || "";
          return `${city}, ${state}, ${country}`;
        },
      },
      {
        accessorKey: "address",
        header: () => t("address"),
      },
      {
        accessorKey: "phoneNumber",
        header: () => t("phoneNumber"),
      },
      {
        accessorKey: "email",
        header: () => t("email"),
      },
      {
        accessorKey: "website",
        header: () => t("website"),
        cell: ({ row }) => {
          const website = row.original.website;
          if (!website) return "-";
          return (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {website}
            </a>
          );
        },
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
                onClick: () => deleteConfirmation.confirmDelete(row.original._id),
                variant: "destructive",
              },
            ]}
          />
        ),
      },
    ],
    [t, tCommon, deleteConfirmation]
  );

  const table = useReactTable({
    data: consulates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: globalFuzzyFilter,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  return (
    <DataGrid
      table={table}
      recordCount={consulates.length}
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
              trigger={
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  {tCommon("columns")}
                </Button>
              }
            />
            <Button
              onClick={() => {
                setEditingConsulate(undefined);
                setIsFormOpen(true);
              }}
              size="sm"
              className="w-full sm:w-auto"
            >
              {t("createTitle")}
            </Button>
          </div>
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

      <ConsulateFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingConsulate(undefined);
          }
        }}
        consulateId={editingConsulate}
      />

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={deleteConfirmation.handleCancel}
        onConfirm={deleteConfirmation.handleConfirm}
        entityName="consulate"
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
