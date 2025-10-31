"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CityFormDialog } from "@/components/cities/city-form-dialog"
import { CitiesTable } from "@/components/cities/cities-table"
import { CityViewModal } from "@/components/cities/city-view-modal"
import { Id } from "@/convex/_generated/dataModel"

export function CitiesClient() {
  const t = useTranslations('Cities')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingId, setViewingId] = useState<Id<"cities"> | null>(null)
  const [editingId, setEditingId] = useState<Id<"cities"> | null>(null)

  const cities = useQuery(api.cities.listWithRelations, {}) ?? []
  const deleteCity = useMutation(api.cities.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('cities') }
  ]

  const handleView = (id: Id<"cities">) => {
    setViewingId(id)
  }

  const handleEdit = (id: Id<"cities">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"cities">) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deleteCity({ id })
      } catch (error) {
        console.error("Error deleting city:", error)
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

        <CitiesTable
          cities={cities}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <CityFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {viewingId && (
          <CityViewModal
            cityId={viewingId}
            open={true}
            onOpenChange={(open) => !open && setViewingId(null)}
            onEdit={() => {
              setEditingId(viewingId)
              setViewingId(null)
            }}
          />
        )}

        {editingId && (
          <CityFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            cityId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
