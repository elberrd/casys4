"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo } from "lucide-react";
import { ProcessTasksTable } from "./process-tasks-table";
import { TaskFormDialog } from "./task-form-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ProcessTasksSectionProps {
  individualProcessId?: Id<"individualProcesses">;
  collectiveProcessId?: Id<"collectiveProcesses">;
  currentUserId?: Id<"users">;
  isAdmin?: boolean;
}

export function ProcessTasksSection({
  individualProcessId,
  collectiveProcessId,
  currentUserId,
  isAdmin = false,
}: ProcessTasksSectionProps) {
  const t = useTranslations("Tasks");
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<Id<"tasks"> | undefined>();

  // Query tasks based on process type
  const tasks = useQuery(
    api.tasks.list,
    individualProcessId
      ? { individualProcessId }
      : collectiveProcessId
        ? { collectiveProcessId }
        : "skip"
  );

  const deleteTask = useMutation(api.tasks.remove);
  const completeTask = useMutation(api.tasks.complete);

  const handleAddTask = () => {
    setEditingTaskId(undefined);
    setIsDialogOpen(true);
  };

  const handleEditTask = (taskId: Id<"tasks">) => {
    setEditingTaskId(taskId);
    setIsDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: Id<"tasks">) => {
    try {
      await deleteTask({ id: taskId });
      toast({
        title: t("deleteSuccess"),
      });
    } catch (error) {
      toast({
        title: t("deleteError"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleCompleteTask = async (taskId: Id<"tasks">) => {
    try {
      await completeTask({ id: taskId });
      toast({
        title: t("completeSuccess"),
      });
    } catch (error) {
      toast({
        title: t("completeError"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTaskId(undefined);
  };

  const isLoading = tasks === undefined;

  // Only show add button if admin
  const canAddTask = isAdmin;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <ListTodo className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          {canAddTask && (
            <Button onClick={handleAddTask} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("newTask")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <ProcessTasksTable
              tasks={tasks || []}
              onEdit={isAdmin ? handleEditTask : undefined}
              onDelete={isAdmin ? handleDeleteTask : undefined}
              onComplete={isAdmin ? handleCompleteTask : undefined}
              isLoading={isLoading}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          )}
        </CardContent>
      </Card>

      <TaskFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        taskId={editingTaskId}
        individualProcessId={individualProcessId}
        collectiveProcessId={collectiveProcessId}
        onSuccess={() => {
          // Tasks will refresh automatically via Convex reactivity
        }}
      />
    </>
  );
}
