"use client";

import { useMemo, useState } from "react";
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
import { Edit, Trash2, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
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
  const canModify = (note: Note) => {
    if (isAdmin) return true;
    return currentUserId && note.createdBy === currentUserId;
  };

  const columns = useMemo<ColumnDef<Note>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("noteDate")} />
        ),
        cell: ({ row }) => {
          const date = row.getValue("date") as string;
          return (
            <span className="whitespace-nowrap">
              {date ? format(new Date(date), "dd/MM/yyyy") : "-"}
            </span>
          );
        },
        size: 120,
        enableGlobalFilter: false,
      },
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
      {
        accessorKey: "content",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("noteContent")} />
        ),
        cell: ({ row }) => {
          const content = row.getValue("content") as string;
          const plainText = stripHtmlTags(content);
          const preview =
            plainText.length > 200
              ? plainText.substring(0, 200) + "..."
              : plainText;
          return (
            <span
              className="text-muted-foreground line-clamp-2"
              title={plainText}
            >
              {preview || "-"}
            </span>
          );
        },
        size: 350,
        minSize: 300,
      },
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
    ],
    [t, tCommon, onEdit, onDelete, onView, deleteConfirmation, currentUserId, isAdmin]
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

      return (
        content.includes(searchValue) ||
        candidateName.includes(searchValue) ||
        processReference.includes(searchValue)
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
