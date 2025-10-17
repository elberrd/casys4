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
import { Id } from "@/convex/_generated/dataModel"

export default function StatesPage() {
  const t = useTranslations('States')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"states"> | null>(null)

  const states = useQuery(api.states.listWithCountry) ?? []
  const deleteState = useMutation(api.states.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('states') }
  ]

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
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon('create')}
          </Button>
        </div>

        <StatesTable
          states={states}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <StateFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

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
