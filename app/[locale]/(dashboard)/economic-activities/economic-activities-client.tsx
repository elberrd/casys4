"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { EconomicActivityFormDialog } from "@/components/economic-activities/economic-activity-form-dialog"
import { EconomicActivitiesTable } from "@/components/economic-activities/economic-activities-table"
import { Id } from "@/convex/_generated/dataModel"

export function EconomicActivitiesClient() {
  const t = useTranslations('EconomicActivities')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"economicActivities"> | null>(null)

  const economicActivities = useQuery(api.economicActivities.list, {}) ?? []
  const deleteEconomicActivity = useMutation(api.economicActivities.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('economicActivities') }
  ]

  const handleEdit = (id: Id<"economicActivities">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"economicActivities">) => {
    try {
      await deleteEconomicActivity({ id })
    } catch (error) {
      console.error("Error deleting economic activity:", error)
      throw error // Let the hook handle the error toast
    }
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
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon('create')}
          </Button>
        </div>

        <EconomicActivitiesTable
          economicActivities={economicActivities}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <EconomicActivityFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {editingId && (
          <EconomicActivityFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            economicActivityId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
