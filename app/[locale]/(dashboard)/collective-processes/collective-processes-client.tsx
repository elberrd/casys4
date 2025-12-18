"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { CollectiveProcessesTable } from "@/components/collective-processes/collective-processes-table"
import { Button } from "@/components/ui/button"
import { ExportDataDialog } from "@/components/ui/export-data-dialog"
import { Plus } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"
import { MultiSelect } from "@/components/ui/multi-select"

export function CollectiveProcessesClient() {
  const t = useTranslations('CollectiveProcesses')
  const tCommon = useTranslations('Common')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const router = useRouter()

  const [selectedProcessTypes, setSelectedProcessTypes] = useState<Id<"processTypes">[]>([])

  const collectiveProcesses = useQuery(api.collectiveProcesses.list, {}) ?? []
  const processTypes = useQuery(api.processTypes.list, {}) ?? []

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('processManagement') },
    { label: tBreadcrumbs('collectiveProcesses') }
  ]

  // Filter collective processes by selected process types
  const filteredCollectiveProcesses = selectedProcessTypes.length > 0
    ? collectiveProcesses.filter(process =>
        process.processType && selectedProcessTypes.includes(process.processType._id)
      )
    : collectiveProcesses

  // Prepare process types options for multi-select
  const processTypeOptions = processTypes.map(type => ({
    value: type._id,
    label: type.name,
  }))

  const handleView = (id: Id<"collectiveProcesses">) => {
    router.push(`/collective-processes/${id}`)
  }

  const handleEdit = (id: Id<"collectiveProcesses">) => {
    router.push(`/collective-processes/${id}/edit`)
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
            <ExportDataDialog defaultExportType="collectiveProcesses" />
            <Button onClick={() => router.push('/collective-processes/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {tCommon('create')}
            </Button>
          </div>
        </div>

        <CollectiveProcessesTable
          collectiveProcesses={filteredCollectiveProcesses}
          onView={handleView}
          onEdit={handleEdit}
          filterSlot={
            <MultiSelect
              options={processTypeOptions}
              defaultValue={selectedProcessTypes}
              onValueChange={setSelectedProcessTypes}
              placeholder={t('selectProcessType')}
              className="w-full sm:w-[250px]"
            />
          }
        />
      </div>
    </>
  )
}
