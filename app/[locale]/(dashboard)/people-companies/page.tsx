"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PersonCompanyFormDialog } from "@/components/people-companies/person-company-form-dialog"
import { PeopleCompaniesTable } from "@/components/people-companies/people-companies-table"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"

export default function PeopleCompaniesPage() {
  const t = useTranslations('PeopleCompanies')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"peopleCompanies"> | null>(null)

  const relationships = useQuery(api.peopleCompanies.list, {}) ?? []
  const deleteRelationship = useMutation(api.peopleCompanies.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('peopleCompanies') },
  ]

  const handleEdit = (id: Id<"peopleCompanies">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"peopleCompanies">) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deleteRelationship({ id })
      } catch (error) {
        console.error("Error deleting employment relationship:", error)
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
          <Button onClick={() => router.push('/people-companies/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon('create')}
          </Button>
        </div>

        <PeopleCompaniesTable
          relationships={relationships}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <PersonCompanyFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {editingId && (
          <PersonCompanyFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            relationshipId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
