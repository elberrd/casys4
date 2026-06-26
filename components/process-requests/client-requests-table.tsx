"use client";

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
} from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Eye, Trash2 } from "lucide-react";

import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridFilter } from "@/components/ui/data-grid-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { globalFuzzyFilter } from "@/lib/fuzzy-search";
import { formatDate } from "@/lib/format-field-value";
import { RequestStatusBadge } from "./request-status-badge";
import type { ProcessRequestListItem } from "./types";

/** One row = one request batch (a multi-candidate request shares a group). */
export interface ClientRequestGroup {
  key: string;
  requestGroupId?: string;
  representative: ProcessRequestListItem;
  candidates: ProcessRequestListItem[];
  requestStatus?: "draft" | "solicitado";
  legalFrameworkName?: string;
  urgent: boolean;
  updatedAt: number;
}

interface ClientRequestsTableProps {
  groups: ClientRequestGroup[];
  onOpen: (group: ClientRequestGroup) => void;
  onContinue: (group: ClientRequestGroup) => void;
  onDelete: (group: ClientRequestGroup) => void;
}

export function ClientRequestsTable({
  groups,
  onOpen,
  onContinue,
  onDelete,
}: ClientRequestsTableProps) {
  const t = useTranslations("ProcessRequests");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  const columns = useMemo<ColumnDef<ClientRequestGroup>[]>(
    () => [
      {
        id: "candidate",
        accessorFn: (g) =>
          g.candidates
            .map((c) => c.person?.fullName)
            .filter(Boolean)
            .join(", ") || "-",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("candidate")} />
        ),
        cell: ({ row }) => {
          const g = row.original;
          const count = g.candidates.length;
          const primary =
            g.representative.person?.fullName ||
            g.legalFrameworkName ||
            t("newRequest");
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {count === 1 ? primary : t("candidatesCount", { count })}
              </span>
              {g.urgent && (
                <Badge variant="destructive" className="text-xs">
                  {t("urgent")}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "legalFramework",
        accessorFn: (g) => g.legalFrameworkName || "-",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("legalFramework")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.legalFrameworkName || "-"}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (g) => g.requestStatus ?? "",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("status")} />
        ),
        cell: ({ row }) => (
          <RequestStatusBadge status={row.original.requestStatus} />
        ),
      },
      {
        id: "updatedAt",
        accessorFn: (g) => g.updatedAt,
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("updatedAt")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(
              new Date(row.original.updatedAt).toISOString().slice(0, 10),
              locale,
            )}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const g = row.original;
          const isDraft = g.requestStatus === "draft";
          return (
            // Stop propagation so the kebab doesn't also trigger the row click.
            <div
              className="flex justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">{tCommon("actions")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpen(g)}>
                    <Eye className="mr-2 h-4 w-4" />
                    {t("viewDetails")}
                  </DropdownMenuItem>
                  {isDraft && (
                    <DropdownMenuItem onClick={() => onContinue(g)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("continueEditing")}
                    </DropdownMenuItem>
                  )}
                  {isDraft && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(g)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {tCommon("delete")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, tCommon, locale, onOpen, onContinue, onDelete],
  );

  const table = useReactTable({
    data: groups,
    columns,
    getRowId: (g) => g.key,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: globalFuzzyFilter,
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <DataGrid
      table={table}
      recordCount={groups.length}
      emptyMessage={t("noRequests")}
      onRowClick={(g) => onOpen(g)}
    >
      <div className="w-full space-y-2.5">
        <DataGridFilter table={table} className="w-full sm:max-w-sm" />
        <DataGridContainer>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>
        <DataGridPagination />
      </div>
    </DataGrid>
  );
}
