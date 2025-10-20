"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { TaskFormPage } from "@/components/tasks/task-form-page"
import { useTranslations } from "next-intl"

export default function NewTaskPage() {
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('tasks'), href: "/tasks" },
    { label: tBreadcrumbs('newTask') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <TaskFormPage />
      </div>
    </>
  )
}
