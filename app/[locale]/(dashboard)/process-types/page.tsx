"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProcessTypeFormDialog } from "@/components/process-types/process-type-form-dialog"
import { ProcessTypesTable } from "@/components/process-types/process-types-table"
import { Id } from "@/convex/_generated/dataModel"

export default function ProcessTypesPage() {
  const t = useTranslations('ProcessTypes')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"processTypes"> | null>(null)

  const processTypes = useQuery(api.processTypes.list, {}) ?? []
  const deleteProcessType = useMutation(api.processTypes.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('processTypes') }
  ]

  const handleEdit = (id: Id<"processTypes">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"processTypes">) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deleteProcessType({ id })
      } catch (error) {
        console.error("Error deleting process type:", error)
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

        <ProcessTypesTable
          processTypes={processTypes}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <ProcessTypeFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {editingId && (
          <ProcessTypeFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            processTypeId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
