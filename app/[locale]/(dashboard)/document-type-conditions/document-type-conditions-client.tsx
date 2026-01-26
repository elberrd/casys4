"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { DocumentTypeConditionsTable } from "@/components/document-type-conditions/document-type-conditions-table"
import { DocumentTypeConditionFormDialog } from "@/components/document-type-conditions/document-type-condition-form-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

export function DocumentTypeConditionsClient() {
  const t = useTranslations('DocumentTypeConditions')
  const tCommon = useTranslations('Common')
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  const conditions = useQuery(api.documentTypeConditions.list, {}) ?? []
  const removeCondition = useMutation(api.documentTypeConditions.remove)

  const [editingCondition, setEditingCondition] = useState<Id<"documentTypeConditions"> | undefined>()
  const [deletingCondition, setDeletingCondition] = useState<Id<"documentTypeConditions"> | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('documentTypeConditions') }
  ]

  const handleEdit = (id: Id<"documentTypeConditions">) => {
    setEditingCondition(id)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: Id<"documentTypeConditions">) => {
    setDeletingCondition(id)
  }

  const confirmDelete = async () => {
    if (!deletingCondition) return

    try {
      await removeCondition({ id: deletingCondition })
      toast.success(t("deletedSuccess"))
      setDeletingCondition(undefined)
    } catch (error) {
      console.error("Error deleting condition:", error)
      const errorMessage = error instanceof Error ? error.message : t("errorDelete")
      toast.error(errorMessage)
    }
  }

  const handleCreateNew = () => {
    setEditingCondition(undefined)
    setIsFormOpen(true)
  }

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <DocumentTypeConditionsTable
          conditions={conditions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
        />
      </div>

      <DocumentTypeConditionFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) {
            setEditingCondition(undefined)
          }
        }}
        conditionId={editingCondition}
      />

      <AlertDialog
        open={!!deletingCondition}
        onOpenChange={(open) => !open && setDeletingCondition(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
