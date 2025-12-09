"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { ProcessWizardPage } from "@/components/process-wizard/process-wizard-page"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

export default function ProcessWizardPageRoute() {
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const t = useTranslations('ProcessWizard')
  const params = useParams()
  const locale = params.locale as string

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: '/dashboard' },
    { label: tBreadcrumbs('processes') },
    { label: t('title') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ProcessWizardPage />
      </div>
    </>
  )
}
