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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions";
import { DataGridHighlightedCell } from "@/components/ui/data-grid-highlighted-cell";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CboCodeFormDialog } from "./cbo-code-form-dialog";
import { globalFuzzyFilter } from "@/lib/fuzzy-search";

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
  const [deletingCboCode, setDeletingCboCode] = useState<Id<"cboCodes"> | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const handleDelete = async () => {
    if (!deletingCboCode) return;

    try {
      await removeCboCode({ id: deletingCboCode });
      toast.success(t("deletedSuccess"));
      setDeletingCboCode(undefined);
    } catch (error) {
      console.error("Error deleting CBO code:", error);
      toast.error(t("errorDelete"));
    }
  };

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
              onClick: () => setDeletingCboCode(row.original._id),
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
      >
        <div className="w-full space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <DataGridFilter table={table} className="w-full sm:max-w-sm" />
            <Button
              onClick={() => {
                setEditingCboCode(undefined);
                setIsFormOpen(true);
              }}
            >
              {t("createTitle")}
            </Button>
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

      <AlertDialog
        open={!!deletingCboCode}
        onOpenChange={(open) => !open && setDeletingCboCode(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
