"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { TaskDetailView } from "@/components/tasks/task-detail-view"
import { ReassignTaskDialog } from "@/components/tasks/reassign-task-dialog"
import { ExtendDeadlineDialog } from "@/components/tasks/extend-deadline-dialog"
import { EntityHistory } from "@/components/activity-logs/entity-history"
import { toast } from "sonner"

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('Tasks')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const taskId = params.id as Id<"tasks">
  const task = useQuery(api.tasks.get, { id: taskId })

  const completeTask = useMutation(api.tasks.complete)
  const deleteTask = useMutation(api.tasks.remove)

  const [isDeleting, setIsDeleting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [extendDeadlineDialogOpen, setExtendDeadlineDialogOpen] = useState(false)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('tasks'), href: "/tasks" },
    { label: task?.title || tCommon('loading') }
  ]

  const handleEdit = () => {
    router.push(`/tasks/${taskId}/edit`)
  }

  const handleDelete = async () => {
    if (!window.confirm(tCommon('deleteConfirm'))) return

    try {
      setIsDeleting(true)
      await deleteTask({ id: taskId })
      toast.success(t('deleteSuccess'))
      router.push('/tasks')
    } catch (error: any) {
      toast.error(error.message || t('deleteError'))
      setIsDeleting(false)
    }
  }

  const handleComplete = async () => {
    try {
      setIsCompleting(true)
      await completeTask({ id: taskId })
      toast.success(t('completeSuccess'))
      setIsCompleting(false)
    } catch (error: any) {
      toast.error(error.message || t('completeError'))
      setIsCompleting(false)
    }
  }

  const handleReassign = () => {
    setReassignDialogOpen(true)
  }

  const handleExtendDeadline = () => {
    setExtendDeadlineDialogOpen(true)
  }

  if (task === undefined) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{tCommon('loading')}</p>
          </div>
        </div>
      </>
    )
  }

  if (task === null) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{t('taskNotFound')}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <TaskDetailView
          task={task}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onComplete={handleComplete}
          onReassign={handleReassign}
          onExtendDeadline={handleExtendDeadline}
        />

        {/* Activity History */}
        <EntityHistory
          entityType="tasks"
          entityId={taskId}
          title={t('activityHistory')}
        />
      </div>

      {/* Reassign Task Dialog */}
      <ReassignTaskDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        taskId={taskId}
        currentAssignee={task.assignedToUser ?? undefined}
        onSuccess={() => {
          setReassignDialogOpen(false)
        }}
      />

      {/* Extend Deadline Dialog */}
      <ExtendDeadlineDialog
        open={extendDeadlineDialogOpen}
        onOpenChange={setExtendDeadlineDialogOpen}
        taskId={taskId}
        currentDueDate={task.dueDate || ""}
        onSuccess={() => {
          setExtendDeadlineDialogOpen(false)
        }}
      />
    </>
  )
}
