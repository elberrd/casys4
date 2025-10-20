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
import { DataGridHighlightedCell } from "@/components/ui/data-grid-highlighted-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Copy, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { createSelectColumn } from "@/lib/data-grid-utils";
import { globalFuzzyFilter } from "@/lib/fuzzy-search";

interface DocumentTemplate {
  _id: Id<"documentTemplates">;
  name: string;
  description: string;
  processTypeId: Id<"processTypes">;
  legalFrameworkId?: Id<"legalFrameworks">;
  isActive: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
  processType: {
    name: string;
  } | null;
  legalFramework: {
    name: string;
  } | null;
  creatorProfile: {
    fullName: string;
  } | null;
  requirementsCount: number;
}

interface DocumentTemplatesDataGridProps {
  templates: DocumentTemplate[];
  onView?: (id: Id<"documentTemplates">) => void;
  onEdit?: (id: Id<"documentTemplates">) => void;
  onClone?: (id: Id<"documentTemplates">) => void;
  onDelete?: (id: Id<"documentTemplates">) => void;
}

export function DocumentTemplatesDataGrid({
  templates,
  onView,
  onEdit,
  onClone,
  onDelete,
}: DocumentTemplatesDataGridProps) {
  const t = useTranslations("DocumentTemplates");
  const tCommon = useTranslations("Common");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns = useMemo<ColumnDef<DocumentTemplate>[]>(
    () => [
      createSelectColumn<DocumentTemplate>(),
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("name")} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell className="font-medium">
            {row.original.name}
          </DataGridHighlightedCell>
        ),
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "processType",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("processType")} />
        ),
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate">
            {row.original.processType?.name || "-"}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "legalFramework",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("legalFramework")} />
        ),
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate">
            {row.original.legalFramework?.name || tCommon("notApplicable")}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "version",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("version")} />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono">
            v{row.original.version}
          </Badge>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "requirementsCount",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("requirementsCount")} />
        ),
        cell: ({ row }) => (
          <div className="text-center">{row.original.requirementsCount}</div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("status")} />
        ),
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" />
              {tCommon("active")}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              {tCommon("inactive")}
            </Badge>
          ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: () => <div className="text-center">{tCommon("actions")}</div>,
        cell: ({ row }) => {
          const actions = [
            {
              label: tCommon("view"),
              icon: Eye,
              onClick: () => onView?.(row.original._id),
            },
            {
              label: tCommon("edit"),
              icon: Edit,
              onClick: () => onEdit?.(row.original._id),
            },
            {
              label: t("clone"),
              icon: Copy,
              onClick: () => onClone?.(row.original._id),
            },
            {
              label: tCommon("delete"),
              icon: Trash2,
              onClick: () => onDelete?.(row.original._id),
              variant: "destructive" as const,
            },
          ];

          return <DataGridRowActions actions={actions} />;
        },
        enableHiding: false,
      },
    ],
    [t, tCommon, onView, onEdit, onClone, onDelete]
  );

  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    globalFilterFn: globalFuzzyFilter,
    state: {
      rowSelection,
    },
  });

  return (
    <DataGridContainer>
      <DataGrid table={table} recordCount={templates.length}>
        <div className="flex items-center justify-between">
          <DataGridFilter
            table={table}
            placeholder={tCommon("search")}
            className="max-w-sm"
          />
          <DataGridColumnVisibility table={table} />
        </div>
        <ScrollArea className="h-[calc(100vh-280px)] rounded-md border">
          <DataGridTable table={table} columns={columns} />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <DataGridPagination table={table} />
      </DataGrid>
    </DataGridContainer>
  );
}
