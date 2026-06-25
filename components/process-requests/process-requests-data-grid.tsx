"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  ColumnDef,
  GroupingState,
  ExpandedState,
} from "@tanstack/react-table";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridFilter } from "@/components/ui/data-grid-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLocale, useTranslations } from "next-intl";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { globalFuzzyFilter } from "@/lib/fuzzy-search";
import { formatDate } from "@/lib/format-field-value";
import { RequestStatusBadge } from "./request-status-badge";
import type { ProcessRequestListItem } from "./types";

interface ProcessRequestsDataGridProps {
  processRequests: ProcessRequestListItem[];
  onRowClick: (request: ProcessRequestListItem) => void;
}

export function ProcessRequestsDataGrid({
  processRequests,
  onRowClick,
}: ProcessRequestsDataGridProps) {
  const t = useTranslations("ProcessRequests");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  const [groupByRequester, setGroupByRequester] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>(true);

  const grouping = useMemo<GroupingState>(
    () => (groupByRequester ? ["company"] : []),
    [groupByRequester]
  );

  const columns = useMemo<ColumnDef<ProcessRequestListItem>[]>(
    () => [
      {
        id: "company",
        accessorFn: (row) => row.company?.name || "-",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("requestedBy")} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.company?.name || "-"}</span>
        ),
      },
      {
        id: "candidate",
        accessorFn: (row) => row.person?.fullName || "-",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("candidate")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.person?.fullName || "-"}
          </span>
        ),
      },
      {
        id: "legalFramework",
        accessorFn: (row) => row.legalFramework?.name || "-",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("legalFramework")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.legalFramework?.name || "-"}
          </span>
        ),
      },
      {
        accessorKey: "requestStatus",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("status")} />
        ),
        cell: ({ row }) => (
          <RequestStatusBadge status={row.original.requestStatus} />
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: "urgent",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("urgent")} />
        ),
        cell: ({ row }) =>
          row.original.urgent ? (
            <Badge variant="destructive" className="text-xs">
              {t("urgent")}
            </Badge>
          ) : null,
      },
      {
        id: "requestedAt",
        accessorFn: (row) => row.requestedAt ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("requestedAt")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.requestedAt
              ? formatDate(
                  new Date(row.original.requestedAt).toISOString().slice(0, 10),
                  locale
                )
              : "-"}
          </span>
        ),
      },
    ],
    [t, locale]
  );

  const table = useReactTable({
    data: processRequests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    globalFilterFn: globalFuzzyFilter,
    onExpandedChange: setExpanded,
    state: {
      grouping,
      expanded,
    },
    initialState: {
      pagination: { pageSize: 50 },
    },
  });

  return (
    <DataGrid
      table={table}
      recordCount={processRequests.length}
      emptyMessage={t("noRequests")}
      onRowClick={(row) => onRowClick(row)}
      tableLayout={{ columnsVisibility: true }}
    >
      <div className="w-full space-y-2.5">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <DataGridFilter table={table} className="w-full sm:max-w-sm" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="group-by-requester"
                checked={groupByRequester}
                onCheckedChange={setGroupByRequester}
              />
              <Label
                htmlFor="group-by-requester"
                className="cursor-pointer text-sm font-medium"
              >
                {t("groupByRequester")}
              </Label>
            </div>
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  {tCommon("columns")}
                </Button>
              }
            />
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
  );
}
