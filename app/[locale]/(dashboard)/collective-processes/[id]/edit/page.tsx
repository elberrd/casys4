"use client"

import { use } from "react"
import { useTranslations } from "next-intl"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { CollectiveProcessFormPage } from "@/components/collective-processes/collective-process-form-page"
import { Id } from "@/convex/_generated/dataModel"

interface EditCollectiveProcessPageProps {
  params: Promise<{
    id: string
    locale: string
  }>
}

export default function EditCollectiveProcessPage({ params }: EditCollectiveProcessPageProps) {
  const resolvedParams = use(params)
  const t = useTranslations('CollectiveProcesses')
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  const processId = resolvedParams.id as Id<"collectiveProcesses">

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: '/dashboard' },
    { label: tBreadcrumbs('processManagement') },
    { label: tBreadcrumbs('collectiveProcesses'), href: '/collective-processes' },
    { label: tBreadcrumbs('editCollectiveProcess') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <CollectiveProcessFormPage mode="edit" processId={processId} />
      </div>
    </>
  )
}
