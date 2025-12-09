"use client"

import { use } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { IndividualProcessFormPage } from "@/components/individual-processes/individual-process-form-page"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

interface EditIndividualProcessPageProps {
  params: Promise<{
    id: string
    locale: string
  }>
  searchParams: Promise<{
    collectiveProcessId?: string
  }>
}

export default function EditIndividualProcessPage({ params, searchParams }: EditIndividualProcessPageProps) {
  const resolvedParams = use(params)
  const resolvedSearchParams = use(searchParams)
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const router = useRouter()

  const processId = resolvedParams.id as Id<"individualProcesses">
  const collectiveProcessId = resolvedSearchParams.collectiveProcessId as Id<"collectiveProcesses"> | undefined

  // Fetch collective process data when coming from collective process context
  const collectiveProcess = useQuery(
    api.collectiveProcesses.get,
    collectiveProcessId ? { id: collectiveProcessId } : "skip"
  )

  // Build breadcrumbs based on context
  const breadcrumbs = collectiveProcessId && collectiveProcess
    ? [
        { label: tBreadcrumbs('dashboard'), href: '/dashboard' },
        { label: tBreadcrumbs('processManagement') },
        { label: tBreadcrumbs('collectiveProcesses'), href: '/collective-processes' },
        { label: collectiveProcess.referenceNumber || '...', href: `/collective-processes/${collectiveProcessId}` },
        { label: tBreadcrumbs('editIndividualProcess') }
      ]
    : [
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
