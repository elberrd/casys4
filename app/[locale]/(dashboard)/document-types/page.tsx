"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { DocumentTypesTable } from "@/components/document-types/document-types-table"
import { DocumentTypeFormDialog } from "@/components/document-types/document-type-form-dialog"
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

export default function DocumentTypesPage() {
  const t = useTranslations('DocumentTypes')
  const tCommon = useTranslations('Common')
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  const documentTypes = useQuery(api.documentTypes.list, {}) ?? []
  const removeDocumentType = useMutation(api.documentTypes.remove)

  const [editingDocumentType, setEditingDocumentType] = useState<Id<"documentTypes"> | undefined>()
  const [deletingDocumentType, setDeletingDocumentType] = useState<Id<"documentTypes"> | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('documentTypes') }
  ]

  const handleEdit = (id: Id<"documentTypes">) => {
    setEditingDocumentType(id)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: Id<"documentTypes">) => {
    setDeletingDocumentType(id)
  }

  const confirmDelete = async () => {
    if (!deletingDocumentType) return

    try {
      await removeDocumentType({ id: deletingDocumentType })
      toast.success(t("deletedSuccess"))
      setDeletingDocumentType(undefined)
    } catch (error) {
      console.error("Error deleting document type:", error)
      toast.error(t("errorDelete"))
    }
  }

  const handleCreateNew = () => {
    setEditingDocumentType(undefined)
    setIsFormOpen(true)
  }

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DocumentTypesTable
          documentTypes={documentTypes}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
        />
      </div>

      <DocumentTypeFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) {
            setEditingDocumentType(undefined)
          }
        }}
        documentTypeId={editingDocumentType}
      />

      <AlertDialog
        open={!!deletingDocumentType}
        onOpenChange={(open) => !open && setDeletingDocumentType(undefined)}
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
