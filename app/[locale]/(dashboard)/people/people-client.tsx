"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PersonFormDialog } from "@/components/people/person-form-dialog"
import { PersonDetailView } from "@/components/people/person-detail-view"
import { PeopleTable } from "@/components/people/people-table"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"

export function PeopleClient() {
  const t = useTranslations('People')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [editingId, setEditingId] = useState<Id<"people"> | null>(null)
  const [viewingId, setViewingId] = useState<Id<"people"> | null>(null)

  const people = useQuery(api.people.list, {}) ?? []
  const deletePerson = useMutation(api.people.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('peopleCompanies') },
    { label: tBreadcrumbs('people') }
  ]

  const handleView = (id: Id<"people">) => {
    setViewingId(id)
  }

  const handleEdit = (id: Id<"people">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"people">) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deletePerson({ id })
      } catch (error) {
        console.error("Error deleting person:", error)
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
          <Button onClick={() => router.push('/people/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon('create')}
          </Button>
        </div>

        <PeopleTable
          people={people}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />

        {viewingId && (
          <PersonDetailView
            personId={viewingId}
            open={true}
            onOpenChange={(open) => !open && setViewingId(null)}
            onEdit={() => {
              setEditingId(viewingId)
              setViewingId(null)
            }}
          />
        )}

        {editingId && (
          <PersonFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            personId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
