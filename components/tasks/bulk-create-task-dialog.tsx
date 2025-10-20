"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarIcon, Loader2, User } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface BulkCreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProcesses: Array<{
    _id: Id<"individualProcesses">
    person?: { fullName: string }
    mainProcess?: { name: string }
  }>
  onSuccess?: () => void
}

export function BulkCreateTaskDialog({
  open,
  onOpenChange,
  selectedProcesses,
  onSuccess,
}: BulkCreateTaskDialogProps) {
  const t = useTranslations("BulkCreateTask")
  const tCommon = useTranslations("Common")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<Date>()
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [assignedTo, setAssignedTo] = useState<Id<"users"> | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const adminUsers = useQuery(api.userProfiles.listAdminUsers)
  const bulkCreateTasks = useMutation(api.tasks.bulkCreateTasks)

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t("titleRequired"))
      return
    }

    if (!description.trim()) {
      toast.error(t("descriptionRequired"))
      return
    }

    if (!dueDate) {
      toast.error(t("dueDateRequired"))
      return
    }

    if (!assignedTo) {
      toast.error(t("assigneeRequired"))
      return
    }

    if (selectedProcesses.length === 0) {
      toast.error(t("noProcessesSelected"))
      return
    }

    setIsSubmitting(true)
    try {
      await bulkCreateTasks({
        individualProcessIds: selectedProcesses.map(p => p._id),
        title: title.trim(),
        description: description.trim(),
        dueDate: format(dueDate, "yyyy-MM-dd"),
        priority,
        assignedToId: assignedTo,
      })

      toast.success(t("createSuccess", { count: selectedProcesses.length }))
      handleClose()
      onSuccess?.()
    } catch (error) {
      console.error("Error creating bulk tasks:", error)
      toast.error(t("createFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setTitle("")
    setDescription("")
    setDueDate(undefined)
    setPriority("medium")
    setAssignedTo(undefined)
    onOpenChange(false)
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "low":
        return t("priority.low")
      case "medium":
        return t("priority.medium")
      case "high":
        return t("priority.high")
      case "urgent":
        return t("priority.urgent")
      default:
        return priority
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { count: selectedProcesses.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4 py-4">
              {/* Selected Processes Preview */}
              <div className="space-y-2">
                <Label>{t("targetProcesses")}</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/50 max-h-32 overflow-y-auto">
                  {selectedProcesses.map((process) => (
                    <Badge key={process._id} variant="secondary">
                      {process.person?.fullName || t("unknownPerson")}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Task Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  {t("taskTitle")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("taskTitlePlaceholder")}
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  {t("taskDescription")} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("taskDescriptionPlaceholder")}
                  rows={4}
                />
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label>
                  {t("dueDate")} <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : t("selectDueDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">
                  {t("taskPriority")} <span className="text-destructive">*</span>
                </Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{getPriorityLabel("low")}</SelectItem>
                    <SelectItem value="medium">{getPriorityLabel("medium")}</SelectItem>
                    <SelectItem value="high">{getPriorityLabel("high")}</SelectItem>
                    <SelectItem value="urgent">{getPriorityLabel("urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label htmlFor="assignee">
                  {t("assignTo")} <span className="text-destructive">*</span>
                </Label>
                {adminUsers === undefined ? (
                  <div className="flex items-center justify-center p-4 border rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {tCommon("loading")}
                  </div>
                ) : (
                  <Select value={assignedTo} onValueChange={(v: any) => setAssignedTo(v)}>
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder={t("selectAssignee")} />
                    </SelectTrigger>
                    <SelectContent>
                      {adminUsers.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {user.fullName || user.email}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("createTasks")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
