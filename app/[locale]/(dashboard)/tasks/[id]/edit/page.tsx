"use client"

import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { TaskFormPage } from "@/components/tasks/task-form-page"

export default function EditTaskPage() {
  const params = useParams()
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')
  const t = useTranslations('Tasks')

  const taskId = params.id as Id<"tasks">
  const task = useQuery(api.tasks.get, { id: taskId })

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('tasks'), href: "/tasks" },
    { label: task?.title || tCommon('loading'), href: `/tasks/${taskId}` },
    { label: tBreadcrumbs('edit') }
  ]

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
        <TaskFormPage taskId={taskId} />
      </div>
    </>
  )
}
