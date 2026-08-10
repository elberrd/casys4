"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  VisibilityState,
} from "@tanstack/react-table";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions";
import { DataGridFilter } from "@/components/ui/data-grid-filter";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { Bell, Edit, Eye, Paperclip, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { format, parseISO } from "date-fns";
import { stripHtmlTags } from "@/components/ui/rich-text-editor";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { Skeleton } from "@/components/ui/skeleton";

interface Note {
  _id: Id<"notes">;
  content: string;
  date: string;
  createdAt: number;
  createdBy: Id<"users">;
  requestedByPersonId?: Id<"people">;
  communicationChannel?: string;
  subject?: string;
  alarmDate?: string;
  alarmNotifiedAt?: number;
  attachmentCount?: number;
  requestedByPerson?: {
    _id: Id<"people">;
    fullName: string;
  } | null;
  candidateName?: string | null;
  processReference?: string | null;
  individualProcess?: {
    _id: Id<"individualProcesses">;
    collectiveProcessId?: Id<"collectiveProcesses">;
    personId?: Id<"people">;
    status?: string;
  } | null;
  collectiveProcess?: {
    _id: Id<"collectiveProcesses">;
    reference: string;
    processTypeId?: Id<"processTypes">;
    companyId?: Id<"companies">;
  } | null;
  createdByUser?: {
    _id: string;
    userId: Id<"users"> | undefined;
    fullName: string;
    email: string;
  } | null;
}

interface NotesTableProps {
  notes: Note[];
  onEdit?: (noteId: Id<"notes">) => void;
  onDelete?: (noteId: Id<"notes">) => void;
  onView?: (noteId: Id<"notes">) => void;
  onRowClick?: (noteId: Id<"notes">) => void;
  isLoading?: boolean;
  currentUserId?: Id<"users">;
  isAdmin?: boolean;
  showSearch?: boolean;
  showColumnVisibility?: boolean;
  showProcessColumns?: boolean;
}

export function NotesTable({
  notes,
  onEdit,
  onDelete,
  onView,
  onRowClick,
  isLoading = false,
  currentUserId,
  isAdmin = false,
  showSearch = false,
  showColumnVisibility = false,
  showProcessColumns = true,
}: NotesTableProps) {
  const t = useTranslations("Notes");
  const tCommon = useTranslations("Common");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    processReference: false, // Hide process reference column by default
  });

  // Delete confirmation
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"notes">) => {
      if (onDelete) await onDelete(id);
    },
    entityName: "note",
  });

  // Check if user can edit/delete a note
  const canModify = useCallback(
    (note: Note) => {
      if (isAdmin) return true;
      return Boolean(currentUserId && note.createdBy === currentUserId);
    },
    [currentUserId, isAdmin],
  );

  const columns = useMemo<ColumnDef<Note>[]>(
    () => {
      const processColumns: ColumnDef<Note>[] = showProcessColumns
        ? [
            {
              accessorKey: "candidateName",
              header: ({ column }) => (
                <DataGridColumnHeader column={column} title={t("candidateName")} />
              ),
              cell: ({ row }) => {
                const candidateName = row.getValue("candidateName") as string | null;
                return (
                  <span className="whitespace-nowrap">
                    {candidateName || "-"}
                  </span>
                );
              },
              size: 200,
            },
            {
              accessorKey: "processReference",
              header: ({ column }) => (
                <DataGridColumnHeader column={column} title={t("processReference")} />
              ),
              cell: ({ row }) => {
                const processReference = row.getValue("processReference") as string | null;
                return (
                  <span className="whitespace-nowrap font-mono text-sm">
                    {processReference || "-"}
                  </span>
                );
              },
              size: 180,
            },
          ]
        : [];

      return [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("noteDate")} />
        ),
        cell: ({ row }) => {
          const date = row.getValue("date") as string;
          return (
            <span className="whitespace-nowrap">
              {date ? format(parseISO(date), "dd/MM/yyyy") : "-"}
            </span>
          );
        },
        size: 120,
        enableGlobalFilter: false,
      },
      {
        accessorKey: "subject",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("subject")} />
        ),
        cell: ({ row }) => {
          const plainText = stripHtmlTags(row.original.content);
          return (
            <div className="min-w-0 py-1">
              <p className="truncate font-medium" title={row.original.subject}>
                {row.original.subject || t("noSubject")}
              </p>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground" title={plainText}>
                {plainText || "-"}
              </p>
            </div>
          );
        },
        size: 320,
        minSize: 240,
      },
      {
        id: "requestedByPerson",
        accessorFn: (note) => note.requestedByPerson?.fullName ?? "",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("requestedBy")} />
        ),
        cell: ({ row }) => (
          <span className="block max-w-52 truncate" title={row.original.requestedByPerson?.fullName}>
            {row.original.requestedByPerson?.fullName || "-"}
          </span>
        ),
        size: 190,
      },
      {
        accessorKey: "communicationChannel",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("communicationChannel")} />
        ),
        cell: ({ row }) => {
          const channel = row.original.communicationChannel;
          const legacyLabels: Record<string, string> = {
            email: t("communicationChannels.email"),
            whatsapp: t("communicationChannels.whatsapp"),
            phone: t("communicationChannels.phone"),
            in_person: t("communicationChannels.inPerson"),
            video_call: t("communicationChannels.videoCall"),
            other: t("communicationChannels.other"),
          };
          const displayChannel = channel
            ? (legacyLabels[channel] ?? channel)
            : "-";
          return <span className="whitespace-nowrap">{displayChannel}</span>;
        },
        size: 150,
      },
      {
        accessorKey: "alarmDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("alarm")} />
        ),
        cell: ({ row }) => (
          row.original.alarmDate ? (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Bell className="size-3.5 text-muted-foreground" />
              <span>{format(parseISO(row.original.alarmDate), "dd/MM/yyyy")}</span>
              {row.original.alarmNotifiedAt && (
                <span className="sr-only">{t("alarmDelivered")}</span>
              )}
            </div>
          ) : "-"
        ),
        size: 145,
      },
      {
        accessorKey: "attachmentCount",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("attachmentCount")} />
        ),
        cell: ({ row }) => (
          <span className="flex items-center gap-2 tabular-nums">
            <Paperclip className="size-3.5 text-muted-foreground" />
            {row.original.attachmentCount ?? 0}
          </span>
        ),
        size: 100,
        enableGlobalFilter: false,
      },
      ...processColumns,
      {
        accessorKey: "createdByUser",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("createdBy")} />
        ),
        cell: ({ row }) => {
          const user = row.original.createdByUser;
          return (
            <span className="whitespace-nowrap">
              {user?.fullName || "-"}
            </span>
          );
        },
        size: 150,
        enableGlobalFilter: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("actions")}</span>,
        cell: ({ row }) => {
          const note = row.original;
          const canEdit = canModify(note);

          const actions = [];

          // Always show view action if onView is provided
          if (onView) {
            actions.push({
              label: t("viewNote"),
              icon: <Eye className="h-4 w-4" />,
              onClick: () => onView(note._id),
              variant: "default" as const,
            });
          }

          // Only show edit/delete if user can modify
          if (canEdit) {
            if (onEdit) {
              actions.push({
                label: tCommon("edit"),
                icon: <Edit className="h-4 w-4" />,
                onClick: () => onEdit(note._id),
                variant: "default" as const,
              });
            }

            if (onDelete) {
              actions.push({
                label: tCommon("delete"),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => deleteConfirmation.confirmDelete(note._id),
                variant: "destructive" as const,
                separator: true,
              });
            }
          }

          if (actions.length === 0) return null;

          return <DataGridRowActions actions={actions} />;
        },
        size: 50,
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
      },
      ];
    },
    [t, tCommon, onEdit, onDelete, onView, deleteConfirmation, canModify, showProcessColumns]
  );

  const table = useReactTable({
    data: notes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnVisibility,
    },
    initialState: {
      sorting: [{ id: "date", desc: true }],
      pagination: { pageSize: 10 },
    },
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = filterValue.toLowerCase();
      const note = row.original;

      // Search across content, candidate name, and process reference
      const content = stripHtmlTags(note.content).toLowerCase();
      const candidateName = (note.candidateName || "").toLowerCase();
      const processReference = (note.processReference || "").toLowerCase();
      const subject = (note.subject || "").toLowerCase();
      const requestedBy = (note.requestedByPerson?.fullName || "").toLowerCase();
      const communicationChannel = (
        note.communicationChannel || ""
      ).toLowerCase();

      return (
        content.includes(searchValue) ||
        candidateName.includes(searchValue) ||
        processReference.includes(searchValue) ||
        subject.includes(searchValue) ||
        requestedBy.includes(searchValue) ||
        communicationChannel.includes(searchValue)
      );
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("noNotes")}
      </div>
    );
  }

  // Handle row click - trigger for all notes
  const handleRowClick = (note: Note) => {
    if (onRowClick) {
      onRowClick(note._id);
    }
  };

  return (
    <>
      <DataGrid
        table={table}
        recordCount={notes.length}
        onRowClick={onRowClick ? handleRowClick : undefined}
      >
        {(showSearch || showColumnVisibility) && (
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-4">
            {showSearch && (
              <DataGridFilter
                table={table}
                placeholder={t("searchNotes")}
              />
            )}
            {showColumnVisibility && (
              <DataGridColumnVisibility table={table} />
            )}
          </div>
        )}
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
        {notes.length > 10 && <DataGridPagination />}
      </DataGrid>

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={deleteConfirmation.handleCancel}
        onConfirm={deleteConfirmation.handleConfirm}
        entityName="note"
        isDeleting={deleteConfirmation.isDeleting}
      />
    </>
  );
}
