"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CaseStatusFormDialog } from "@/components/case-statuses/case-status-form-dialog"
import { CaseStatusesTable } from "@/components/case-statuses/case-statuses-table"
import { CaseStatusViewModal } from "@/components/case-statuses/case-status-view-modal"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

export function CaseStatusesClient() {
  const t = useTranslations('CaseStatuses')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingId, setViewingId] = useState<Id<"caseStatuses"> | null>(null)
  const [editingId, setEditingId] = useState<Id<"caseStatuses"> | null>(null)

  const caseStatuses = useQuery(api.caseStatuses.list, { includeInactive: true }) ?? []
  const deleteCaseStatus = useMutation(api.caseStatuses.remove)
  const toggleActive = useMutation(api.caseStatuses.toggleActive)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('settings') },
    { label: tBreadcrumbs('caseStatuses') }
  ]

  const handleView = (id: Id<"caseStatuses">) => {
    setViewingId(id)
  }

  const handleEdit = (id: Id<"caseStatuses">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"caseStatuses">) => {
    try {
      await deleteCaseStatus({ id })
      toast({
        title: t('deletedSuccess'),
      })
    } catch (error) {
      toast({
        title: t('errorDelete'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (id: Id<"caseStatuses">, isActive: boolean) => {
    try {
      await toggleActive({ id, isActive })
      toast({
        title: isActive ? t('activatedSuccess') : t('deactivatedSuccess'),
      })
    } catch (error) {
      toast({
        title: t('errorToggle'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
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
          <Button onClick={() => setIsCreateOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            {tCommon('create')}
          </Button>
        </div>

        <CaseStatusesTable
          caseStatuses={caseStatuses}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />

        <CaseStatusFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {viewingId && (
          <CaseStatusViewModal
            caseStatusId={viewingId}
            open={true}
            onOpenChange={(open) => !open && setViewingId(null)}
            onEdit={() => {
              setEditingId(viewingId)
              setViewingId(null)
            }}
          />
        )}

        {editingId && (
          <CaseStatusFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            caseStatusId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
