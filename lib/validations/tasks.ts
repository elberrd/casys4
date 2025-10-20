import { z } from "zod"
import { Id } from "@/convex/_generated/dataModel"

export const taskSchema = z.object({
  individualProcessId: z.custom<Id<"individualProcesses">>().optional(),
  mainProcessId: z.custom<Id<"mainProcesses">>().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    required_error: "Priority is required",
  }),
  status: z.enum(["todo", "in_progress", "completed", "cancelled"]).optional(),
  assignedTo: z.custom<Id<"users">>(),
}).refine(
  (data) => data.individualProcessId || data.mainProcessId,
  {
    message: "Either Individual Process or Main Process must be selected",
    path: ["individualProcessId"],
  }
)

export type TaskFormData = z.infer<typeof taskSchema>

export const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const

export const statusOptions = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const

export const reassignTaskSchema = z.object({
  newAssignee: z.custom<Id<"users">>(),
  notes: z.string().optional(),
})

export type ReassignTaskFormData = z.infer<typeof reassignTaskSchema>

export const extendDeadlineSchema = z.object({
  newDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  reason: z.string().optional(),
}).refine(
  (data) => {
    const newDate = new Date(data.newDueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return newDate > today
  },
  {
    message: "New due date must be in the future",
    path: ["newDueDate"],
  }
)

export type ExtendDeadlineFormData = z.infer<typeof extendDeadlineSchema>

export const updateStatusSchema = z.object({
  newStatus: z.enum(["todo", "in_progress", "completed", "cancelled"]),
  notes: z.string().optional(),
})

export type UpdateStatusFormData = z.infer<typeof updateStatusSchema>
