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
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { createSelectColumn } from "@/lib/data-grid-utils";
import { globalFuzzyFilter } from "@/lib/fuzzy-search";
import { formatDate } from "@/lib/format-field-value";

interface ProcessRequest {
  _id: Id<"processRequests">;
  companyId: Id<"companies">;
  contactPersonId: Id<"people">;
  processTypeId: Id<"processTypes">;
  workplaceCityId: Id<"cities">;
  consulateId?: Id<"consulates">;
  isUrgent: boolean;
  requestDate: string;
  notes?: string;
  status: string;
  reviewedBy?: Id<"users">;
  reviewedAt?: number;
  rejectionReason?: string;
  approvedMainProcessId?: Id<"mainProcesses">;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  company: {
    name: string;
  } | null;
  contactPerson: {
    fullName: string;
  } | null;
  processType: {
    name: string;
  } | null;
  workplaceCity: {
    name: string;
  } | null;
  consulate: {
    city?: {
      name: string;
    } | null;
  } | null;
  reviewerProfile: {
    fullName: string;
  } | null;
  approvedMainProcess: {
    referenceNumber: string;
  } | null;
}

interface ProcessRequestsDataGridProps {
  processRequests: ProcessRequest[];
  onApprove?: (id: Id<"processRequests">) => void;
  onReject?: (id: Id<"processRequests">) => void;
  onViewDetails?: (id: Id<"processRequests">) => void;
  userRole: "admin" | "client";
}

export function ProcessRequestsDataGrid({
  processRequests,
  onApprove,
  onReject,
  onViewDetails,
  userRole,
}: ProcessRequestsDataGridProps) {
  const t = useTranslations("ProcessRequests");
  const tCommon = useTranslations("Common");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {t("statusPending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            {t("statusApproved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t("statusRejected")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns = useMemo<ColumnDef<ProcessRequest>[]>(
    () => [
      createSelectColumn<ProcessRequest>(),
      {
        id: "reference",
        accessorFn: (row) => row._id.slice(-8),
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("reference")} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell
            text={`#${row.original._id.slice(-8).toUpperCase()}`}
          />
        ),
      },
      {
        id: "company",
        accessorFn: (row) => row.company?.name || "-",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("company")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.company?.name || "-"}
          </span>
        ),
      },
      {
        id: "processType",
        accessorFn: (row) => row.processType?.name || "-",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("processType")} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.processType?.name || "-"}
          </span>
        ),
      },
      {
        id: "contactPerson",
        accessorFn: (row) => row.contactPerson?.fullName || "-",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("contactPerson")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.contactPerson?.fullName || "-"}
          </span>
        ),
      },
      {
        accessorKey: "requestDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("requestDate")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.requestDate)}
          </span>
        ),
      },
      {
        accessorKey: "isUrgent",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("urgent")} />
        ),
        cell: ({ row }) =>
          row.original.isUrgent ? (
            <Badge variant="destructive" className="text-xs">
              {t("urgent")}
            </Badge>
          ) : null,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("status")} />
        ),
        cell: ({ row }) => getStatusBadge(row.original.status),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) => {
          const actions = [];

          // View details action - available for all
          if (onViewDetails) {
            actions.push({
              label: t("viewDetails"),
              icon: <Eye className="h-4 w-4" />,
              onClick: () => onViewDetails(row.original._id),
              variant: "default" as const,
            });
          }

          // Admin-only actions for pending requests
          if (userRole === "admin" && row.original.status === "pending") {
            if (onApprove) {
              actions.push({
                label: t("approve"),
                icon: <CheckCircle className="h-4 w-4" />,
                onClick: () => onApprove(row.original._id),
                variant: "default" as const,
              });
            }

            if (onReject) {
              actions.push({
                label: t("reject"),
                icon: <XCircle className="h-4 w-4" />,
                onClick: () => onReject(row.original._id),
                variant: "destructive" as const,
                separator: true,
              });
            }
          }

          return <DataGridRowActions actions={actions} />;
        },
        size: 50,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, tCommon, onApprove, onReject, onViewDetails, userRole]
  );

  const table = useReactTable({
    data: processRequests,
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
      recordCount={processRequests.length}
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
            trigger={
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Columns
              </Button>
            }
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
  );
}
