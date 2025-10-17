"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { LegalFrameworkFormDialog } from "@/components/legal-frameworks/legal-framework-form-dialog"
import { LegalFrameworksTable } from "@/components/legal-frameworks/legal-frameworks-table"
import { Id } from "@/convex/_generated/dataModel"

export default function LegalFrameworksPage() {
  const t = useTranslations('LegalFrameworks')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"legalFrameworks"> | null>(null)

  const legalFrameworks = useQuery(api.legalFrameworks.list, {}) ?? []
  const deleteLegalFramework = useMutation(api.legalFrameworks.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('legalFrameworks') }
  ]

  const handleEdit = (id: Id<"legalFrameworks">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"legalFrameworks">) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deleteLegalFramework({ id })
      } catch (error) {
        console.error("Error deleting legal framework:", error)
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

        <LegalFrameworksTable
          legalFrameworks={legalFrameworks}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <LegalFrameworkFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {editingId && (
          <LegalFrameworkFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            legalFrameworkId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
