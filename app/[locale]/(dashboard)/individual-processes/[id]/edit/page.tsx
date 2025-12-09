"use client"

import { use } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { IndividualProcessFormPage } from "@/components/individual-processes/individual-process-form-page"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"

interface EditIndividualProcessPageProps {
  params: Promise<{
    id: string
    locale: string
  }>
}

export default function EditIndividualProcessPage({ params }: EditIndividualProcessPageProps) {
  const resolvedParams = use(params)
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const router = useRouter()

  const processId = resolvedParams.id as Id<"individualProcesses">

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: '/dashboard' },
    { label: tBreadcrumbs('processManagement') },
    { label: tBreadcrumbs('individualProcesses'), href: '/individual-processes' },
    { label: tBreadcrumbs('editIndividualProcess') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <IndividualProcessFormPage
          individualProcessId={processId}
        />
      </div>
    </>
  )
}
