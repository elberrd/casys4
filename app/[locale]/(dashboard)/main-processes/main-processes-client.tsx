"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { MainProcessesTable } from "@/components/main-processes/main-processes-table"
import { Button } from "@/components/ui/button"
import { ExportDataDialog } from "@/components/ui/export-data-dialog"
import { Plus } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"

export function MainProcessesClient() {
  const t = useTranslations('MainProcesses')
  const tCommon = useTranslations('Common')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const router = useRouter()

  const mainProcesses = useQuery(api.mainProcesses.list, {}) ?? []

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('processManagement') },
    { label: tBreadcrumbs('mainProcesses') }
  ]

  const handleView = (id: Id<"mainProcesses">) => {
    router.push(`/main-processes/${id}`)
  }

  const handleEdit = (id: Id<"mainProcesses">) => {
    router.push(`/main-processes/${id}/edit`)
  }

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportDataDialog defaultExportType="mainProcesses" />
            <Button onClick={() => router.push('/main-processes/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {tCommon('create')}
            </Button>
          </div>
        </div>

        <MainProcessesTable
          mainProcesses={mainProcesses}
          onView={handleView}
          onEdit={handleEdit}
        />
      </div>
    </>
  )
}
