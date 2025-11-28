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
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions";
import { Edit, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { stripHtmlTags } from "@/components/ui/rich-text-editor";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { Skeleton } from "@/components/ui/skeleton";

interface Note {
  _id: Id<"notes">;
  title: string;
  content: string;
  date: string;
  createdAt: number;
  createdBy: Id<"users">;
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
  isLoading?: boolean;
  currentUserId?: Id<"users">;
  isAdmin?: boolean;
}

export function NotesTable({
  notes,
  onEdit,
  onDelete,
  isLoading = false,
  currentUserId,
  isAdmin = false,
}: NotesTableProps) {
  const t = useTranslations("Notes");
  const tCommon = useTranslations("Common");

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
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("noteTitle")} />
        ),
        cell: ({ row }) => {
          const title = row.getValue("title") as string;
          return (
            <span className="font-medium line-clamp-1" title={title}>
              {title}
            </span>
          );
        },
        size: 200,
      },
      {
        accessorKey: "content",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("preview")} />
        ),
        cell: ({ row }) => {
          const content = row.getValue("content") as string;
          const plainText = stripHtmlTags(content);
          const preview =
            plainText.length > 100
              ? plainText.substring(0, 100) + "..."
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
        size: 300,
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
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("actions")}</span>,
        cell: ({ row }) => {
          const note = row.original;
          const canEdit = canModify(note);

          if (!canEdit) return null;

          const actions = [];

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

          if (actions.length === 0) return null;

          return <DataGridRowActions actions={actions} />;
        },
        size: 50,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, tCommon, onEdit, onDelete, deleteConfirmation, currentUserId, isAdmin]
  );

  const table = useReactTable({
    data: notes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      sorting: [{ id: "date", desc: true }],
      pagination: { pageSize: 10 },
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

  return (
    <>
      <DataGrid table={table} recordCount={notes.length}>
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
