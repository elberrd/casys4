"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { StateFormDialog } from "@/components/states/state-form-dialog"
import { StatesTable } from "@/components/states/states-table"
import { StateViewModal } from "@/components/states/state-view-modal"
import { Id } from "@/convex/_generated/dataModel"

export function StatesClient() {
  const t = useTranslations('States')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingId, setViewingId] = useState<Id<"states"> | null>(null)
  const [editingId, setEditingId] = useState<Id<"states"> | null>(null)

  const states = useQuery(api.states.listWithCountry, {}) ?? []
  const deleteState = useMutation(api.states.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('states') }
  ]

  const handleView = (id: Id<"states">) => {
    setViewingId(id)
  }

  const handleEdit = (id: Id<"states">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"states">) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deleteState({ id })
      } catch (error) {
        console.error("Error deleting state:", error)
        alert(t('errorDelete'))
      }
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

        <StatesTable
          states={states}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <StateFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {viewingId && (
          <StateViewModal
            stateId={viewingId}
            open={true}
            onOpenChange={(open) => !open && setViewingId(null)}
            onEdit={() => {
              setEditingId(viewingId)
              setViewingId(null)
            }}
          />
        )}

        {editingId && (
          <StateFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            stateId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
