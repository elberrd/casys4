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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, User, ArrowRight } from "lucide-react"
import { toast } from "sonner"

interface BulkReassignTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTasks: Array<{
    _id: Id<"tasks">
    title: string
    assignedTo?: Id<"users">
    assignedToUser?: { name?: string; email?: string }
  }>
  onSuccess?: () => void
}

export function BulkReassignTasksDialog({
  open,
  onOpenChange,
  selectedTasks,
  onSuccess,
}: BulkReassignTasksDialogProps) {
  const t = useTranslations("BulkReassignTasks")
  const tCommon = useTranslations("Common")

  const [newAssigneeId, setNewAssigneeId] = useState<Id<"users"> | undefined>()
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const adminUsers = useQuery(api.userProfiles.list, { role: "admin", isActive: true })
  const bulkReassignTasks = useMutation(api.tasks.bulkReassignTasks)

  const handleSubmit = async () => {
    if (!newAssigneeId) {
      toast.error(t("assigneeRequired"))
      return
    }

    if (selectedTasks.length === 0) {
      toast.error(t("noTasksSelected"))
      return
    }

    setIsSubmitting(true)
    try {
      await bulkReassignTasks({
        taskIds: selectedTasks.map(task => task._id),
        newAssigneeId,
        reason: reason.trim() || undefined,
      })

      toast.success(t("reassignSuccess", { count: selectedTasks.length }))
      handleClose()
      onSuccess?.()
    } catch (error) {
      console.error("Error reassigning tasks:", error)
      toast.error(t("reassignFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setNewAssigneeId(undefined)
    setReason("")
    onOpenChange(false)
  }

  // Check if new assignee is different from current assignees
  const isDifferentAssignee = () => {
    if (!newAssigneeId) return false
    return selectedTasks.some(task => task.assignedTo !== newAssigneeId)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { count: selectedTasks.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4 py-4">
              {/* Selected Tasks Preview */}
              <div className="space-y-2">
                <Label>{t("selectedTasks")}</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/50">
                  {selectedTasks.map((task) => (
                    <div
                      key={task._id}
                      className="flex items-center justify-between gap-2 p-2 bg-background rounded border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.assignedToUser && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">
                              {task.assignedToUser.name || task.assignedToUser.email}
                            </span>
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* New Assignee */}
              <div className="space-y-2">
                <Label htmlFor="newAssignee">
                  {t("newAssignee")} <span className="text-destructive">*</span>
                </Label>
                {adminUsers === undefined ? (
                  <div className="flex items-center justify-center p-4 border rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {tCommon("loading")}
                  </div>
                ) : (
                  <Select value={newAssigneeId} onValueChange={(v: any) => setNewAssigneeId(v)}>
                    <SelectTrigger id="newAssignee">
                      <SelectValue placeholder={t("selectNewAssignee")} />
                    </SelectTrigger>
                    <SelectContent>
                      {adminUsers.map((user) => (
                        <SelectItem key={user.userId} value={user.userId}>
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

              {/* Reason/Notes */}
              <div className="space-y-2">
                <Label htmlFor="reason">
                  {t("reason")} <span className="text-muted-foreground">({tCommon("optional")})</span>
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("reasonPlaceholder")}
                  rows={3}
                />
              </div>

              {/* Warning if new assignee is same as current */}
              {newAssigneeId && !isDifferentAssignee() && (
                <div className="p-3 border border-yellow-500/50 bg-yellow-500/10 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    {t("sameAssigneeWarning")}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !newAssigneeId || !isDifferentAssignee()}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("reassignTasks")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
