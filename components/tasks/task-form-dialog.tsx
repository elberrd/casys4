"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, CalendarIcon } from "lucide-react";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Simplified schema for inline task creation
const inlineTaskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "completed", "cancelled"]).optional(),
  assignedTo: z.string().min(1, "Assignee is required"),
});

type InlineTaskFormData = z.infer<typeof inlineTaskFormSchema>;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: Id<"tasks">;
  individualProcessId?: Id<"individualProcesses">;
  collectiveProcessId?: Id<"collectiveProcesses">;
  onSuccess?: () => void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  taskId,
  individualProcessId,
  collectiveProcessId,
  onSuccess,
}: TaskFormDialogProps) {
  const t = useTranslations("Tasks");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!taskId;

  // Query existing task if editing
  const existingTask = useQuery(
    api.tasks.get,
    taskId ? { id: taskId } : "skip"
  );

  // Query admin users for assignment
  const adminUsers = useQuery(api.userProfiles.listAdminUsers);

  // Query current user to use as default assignee
  const currentUser = useQuery(api.userProfiles.getCurrentUser);

  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);

  const form = useForm<InlineTaskFormData>({
    resolver: zodResolver(inlineTaskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      priority: "low",
      status: "todo",
      assignedTo: "",
    },
  });

  // Unsaved changes protection
  const {
    showUnsavedDialog,
    setShowUnsavedDialog,
    handleOpenChange: handleUnsavedOpenChange,
    handleConfirmClose,
    handleCancelClose,
  } = useUnsavedChanges({
    formState: form.formState,
    onConfirmedClose: () => {
      form.reset();
      onOpenChange(false);
    },
    isSubmitting: form.formState.isSubmitting,
  });

  // Reset form when dialog opens or task data loads
  useEffect(() => {
    if (open) {
      if (existingTask && isEditing) {
        form.reset({
          title: existingTask.title,
          description: existingTask.description || "",
          dueDate: existingTask.dueDate || "",
          priority: existingTask.priority as "low" | "medium" | "high" | "urgent",
          status: existingTask.status as "todo" | "in_progress" | "completed" | "cancelled",
          assignedTo: existingTask.assignedTo || "",
        });
      } else if (!isEditing) {
        // Default assignee is the current logged-in user
        const defaultAssignee = currentUser?.userId || "";
        form.reset({
          title: "",
          description: "",
          dueDate: "",
          priority: "low",
          status: "todo",
          assignedTo: defaultAssignee,
        });
      }
    }
  }, [open, existingTask, isEditing, form, currentUser]);

  const onSubmit = async (data: InlineTaskFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && taskId) {
        await updateTask({
          id: taskId,
          title: data.title,
          description: data.description,
          dueDate: data.dueDate || undefined,
          priority: data.priority,
          status: data.status,
          assignedTo: data.assignedTo as Id<"users">,
        });
        toast({
          title: t("updateSuccess"),
        });
      } else {
        await createTask({
          title: data.title,
          description: data.description || "",
          dueDate: data.dueDate || undefined,
          priority: data.priority,
          assignedTo: data.assignedTo as Id<"users">,
          individualProcessId,
          collectiveProcessId,
        });
        toast({
          title: t("createSuccess"),
        });
      }

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast({
        title: isEditing ? t("updateError") : t("createError"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleUnsavedOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editTask") : t("createTask")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("editTaskDescription") || "Update the task details below."
              : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tCommon("title")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("titlePlaceholder")}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tCommon("description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("descriptionPlaceholder")}
                      {...field}
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Due Date field */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("dueDate")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                          >
                            {field.value ? (
                              format(new Date(field.value), "dd/MM/yyyy")
                            ) : (
                              <span>{t("selectDueDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(format(date, "yyyy-MM-dd"));
                            }
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority field */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("priority")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectPriority")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{t("priorities.low")}</SelectItem>
                        <SelectItem value="medium">{t("priorities.medium")}</SelectItem>
                        <SelectItem value="high">{t("priorities.high")}</SelectItem>
                        <SelectItem value="urgent">{t("priorities.urgent")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status field - only show when editing */}
            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tCommon("status")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectStatus")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="todo">{t("statuses.todo")}</SelectItem>
                        <SelectItem value="in_progress">{t("statuses.in_progress")}</SelectItem>
                        <SelectItem value="completed">{t("statuses.completed")}</SelectItem>
                        <SelectItem value="cancelled">{t("statuses.cancelled")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Assigned To field */}
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("assignedTo")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectUser")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {adminUsers
                        ?.filter((user) => user.userId)
                        .map((user) => (
                          <SelectItem key={user._id} value={user.userId as string}>
                            {user.fullName} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("assignedToDescription") || "Select a team member to assign this task."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? tCommon("save") : tCommon("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Unsaved Changes Confirmation Dialog */}
    <UnsavedChangesDialog
      open={showUnsavedDialog}
      onOpenChange={setShowUnsavedDialog}
      onConfirm={handleConfirmClose}
      onCancel={handleCancelClose}
    />
    </>
  );
}
