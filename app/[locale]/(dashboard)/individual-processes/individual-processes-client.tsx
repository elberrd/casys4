"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { IndividualProcessesTable } from "@/components/individual-processes/individual-processes-table"
import { IndividualProcessFormDialog } from "@/components/individual-processes/individual-process-form-dialog"
import { Button } from "@/components/ui/button"
import { ExportDataDialog } from "@/components/ui/export-data-dialog"
import { Plus } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"

export function IndividualProcessesClient() {
  const t = useTranslations('IndividualProcesses')
  const tCommon = useTranslations('Common')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const router = useRouter()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProcessId, setSelectedProcessId] = useState<Id<"individualProcesses"> | undefined>(undefined)

  const individualProcesses = useQuery(api.individualProcesses.list, {}) ?? []
  const deleteIndividualProcess = useMutation(api.individualProcesses.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('processManagement') },
    { label: tBreadcrumbs('individualProcesses') }
  ]

  const handleCreate = () => {
    setSelectedProcessId(undefined)
    setIsDialogOpen(true)
  }

  const handleView = (id: Id<"individualProcesses">) => {
    router.push(`/individual-processes/${id}`)
  }

  const handleEdit = (id: Id<"individualProcesses">) => {
    setSelectedProcessId(id)
    setIsDialogOpen(true)
  }

  const handleSuccess = () => {
    setIsDialogOpen(false)
    setSelectedProcessId(undefined)
  }

  const handleDelete = async (id: Id<"individualProcesses">) => {
    await deleteIndividualProcess({ id })
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
            <ExportDataDialog defaultExportType="individualProcesses" />
            <Button onClick={() => router.push('/individual-processes/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {tCommon('create')}
            </Button>
          </div>
        </div>

        <IndividualProcessesTable
          individualProcesses={individualProcesses}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRowClick={handleView}
        />

        <IndividualProcessFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          individualProcessId={selectedProcessId}
          onSuccess={handleSuccess}
        />
      </div>
    </>
  )
}
