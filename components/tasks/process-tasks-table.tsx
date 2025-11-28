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
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { format, isPast, isToday } from "date-fns";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Task {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  dueDate?: string;
  priority: string;
  status: string;
  assignedTo?: Id<"users">;
  createdAt: number;
  createdBy: Id<"users">;
  completedAt?: number;
  assignedToUser?: {
    _id: string;
    userId: Id<"users"> | undefined;
    fullName: string;
    email: string;
  } | null;
  createdByUser?: {
    _id: string;
    userId: Id<"users"> | undefined;
    fullName: string;
    email: string;
  } | null;
}

interface ProcessTasksTableProps {
  tasks: Task[];
  onEdit?: (taskId: Id<"tasks">) => void;
  onDelete?: (taskId: Id<"tasks">) => void;
  onComplete?: (taskId: Id<"tasks">) => void;
  isLoading?: boolean;
  currentUserId?: Id<"users">;
  isAdmin?: boolean;
}

const priorityConfig: Record<string, { className: string }> = {
  low: {
    className: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
  },
  medium: {
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
  },
  high: {
    className: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
  },
  urgent: {
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
  },
};

const statusConfig: Record<string, { className: string; icon: React.ReactNode }> = {
  todo: {
    className: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    icon: <Clock className="h-3 w-3" />
  },
  in_progress: {
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    icon: <Clock className="h-3 w-3 animate-pulse" />
  },
  completed: {
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    icon: <CheckCircle className="h-3 w-3" />
  },
  cancelled: {
    className: "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
    icon: <AlertCircle className="h-3 w-3" />
  },
};

export function ProcessTasksTable({
  tasks,
  onEdit,
  onDelete,
  onComplete,
  isLoading = false,
  currentUserId,
  isAdmin = false,
}: ProcessTasksTableProps) {
  const t = useTranslations("Tasks");
  const tCommon = useTranslations("Common");

  // Delete confirmation
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"tasks">) => {
      if (onDelete) await onDelete(id);
    },
    entityName: "task",
  });

  // Check if user can edit/delete a task
  const canModify = (task: Task) => {
    if (isAdmin) return true;
    return currentUserId && task.createdBy === currentUserId;
  };

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tCommon("title")} />
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
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tCommon("status")} />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          const config = statusConfig[status] || statusConfig.todo;
          const statusLabel = t(`statuses.${status}` as any) || status;
          return (
            <Badge variant="outline" className={cn("gap-1 border", config.className)}>
              {config.icon}
              {statusLabel}
            </Badge>
          );
        },
        size: 140,
      },
      {
        accessorKey: "priority",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("priority")} />
        ),
        cell: ({ row }) => {
          const priority = row.getValue("priority") as string;
          const config = priorityConfig[priority] || priorityConfig.medium;
          const priorityLabel = t(`priorities.${priority}` as any) || priority;
          return (
            <Badge variant="outline" className={cn("border", config.className)}>
              {priorityLabel}
            </Badge>
          );
        },
        size: 100,
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("dueDate")} />
        ),
        cell: ({ row }) => {
          const dueDate = row.getValue("dueDate") as string | undefined;
          const status = row.original.status;

          if (!dueDate) return <span className="text-muted-foreground">-</span>;

          const date = new Date(dueDate);
          const isOverdue = isPast(date) && !isToday(date) && status !== "completed" && status !== "cancelled";
          const isDueToday = isToday(date) && status !== "completed" && status !== "cancelled";

          return (
            <span
              className={cn(
                "whitespace-nowrap",
                isOverdue && "text-destructive font-medium",
                isDueToday && "text-orange-600 font-medium"
              )}
            >
              {format(date, "dd/MM/yyyy")}
              {isOverdue && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {t("overdue")}
                </Badge>
              )}
            </span>
          );
        },
        size: 150,
      },
      {
        accessorKey: "assignedToUser",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("assignedTo")} />
        ),
        cell: ({ row }) => {
          const user = row.original.assignedToUser;
          return (
            <span className="whitespace-nowrap text-sm">
              {user?.fullName || "-"}
            </span>
          );
        },
        size: 150,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) => {
          const task = row.original;
          const canEdit = canModify(task);
          const canComplete = canEdit && task.status !== "completed" && task.status !== "cancelled";

          if (!canEdit) return null;

          const actions = [];

          if (canComplete && onComplete) {
            actions.push({
              label: t("completeTask"),
              icon: <CheckCircle className="h-4 w-4" />,
              onClick: () => onComplete(task._id),
              variant: "default" as const,
            });
          }

          if (onEdit) {
            actions.push({
              label: tCommon("edit"),
              icon: <Edit className="h-4 w-4" />,
              onClick: () => onEdit(task._id),
              variant: "default" as const,
            });
          }

          if (onDelete) {
            actions.push({
              label: tCommon("delete"),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => deleteConfirmation.confirmDelete(task._id),
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
    [t, tCommon, onEdit, onDelete, onComplete, deleteConfirmation, currentUserId, isAdmin]
  );

  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      sorting: [{ id: "dueDate", desc: false }],
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

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("noResults")}
      </div>
    );
  }

  return (
    <>
      <DataGrid table={table} recordCount={tasks.length}>
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
        {tasks.length > 10 && <DataGridPagination />}
      </DataGrid>

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={deleteConfirmation.handleCancel}
        onConfirm={deleteConfirmation.handleConfirm}
        entityName="task"
        isDeleting={deleteConfirmation.isDeleting}
      />
    </>
  );
}
