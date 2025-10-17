"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { IndividualProcessFormPage } from "@/components/individual-processes/individual-process-form-page"
import { useTranslations } from "next-intl"

export default function NewIndividualProcessPage() {
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tIndividualProcesses = useTranslations('IndividualProcesses')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('processes') },
    { label: tBreadcrumbs('individualProcesses'), href: "/individual-processes" },
    { label: tBreadcrumbs('newIndividualProcess') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <IndividualProcessFormPage />
      </div>
    </>
  )
}
