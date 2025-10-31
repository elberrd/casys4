"use client"

import { useState, useCallback } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { LegalFrameworkFormDialog } from "@/components/legal-frameworks/legal-framework-form-dialog"
import { LegalFrameworksTable } from "@/components/legal-frameworks/legal-frameworks-table"
import { LegalFrameworkViewModal } from "@/components/legal-frameworks/legal-framework-view-modal"
import { Id } from "@/convex/_generated/dataModel"

export function LegalFrameworksClient() {
  const t = useTranslations('LegalFrameworks')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingId, setViewingId] = useState<Id<"legalFrameworks"> | null>(null)
  const [editingId, setEditingId] = useState<Id<"legalFrameworks"> | null>(null)

  const legalFrameworks = useQuery(api.legalFrameworks.list, {}) ?? []
  const processTypes = useQuery(api.processTypes.list, {}) ?? []
  const deleteLegalFramework = useMutation(api.legalFrameworks.remove)

  // Join legal frameworks with process types
  const enrichedLegalFrameworks = legalFrameworks.map((lf) => ({
    ...lf,
    processTypeName: processTypes.find((pt) => pt._id === lf.processTypeId)?.name,
  }))

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('legalFrameworks') }
  ]

  const handleView = useCallback((id: Id<"legalFrameworks">) => {
    setViewingId(id)
  }, [])

  const handleEdit = useCallback((id: Id<"legalFrameworks">) => {
    setEditingId(id)
  }, [])

  const handleDelete = useCallback(async (id: Id<"legalFrameworks">) => {
    try {
      await deleteLegalFramework({ id })
    } catch (error) {
      console.error("Error deleting legal framework:", error)
      throw error
    }
  }, [deleteLegalFramework])

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

        <LegalFrameworksTable
          legalFrameworks={enrichedLegalFrameworks}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <LegalFrameworkFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {viewingId && (
          <LegalFrameworkViewModal
            legalFrameworkId={viewingId}
            open={true}
            onOpenChange={(open) => !open && setViewingId(null)}
            onEdit={() => {
              setEditingId(viewingId)
              setViewingId(null)
            }}
          />
        )}

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
