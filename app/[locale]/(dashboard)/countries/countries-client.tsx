"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CountryFormDialog } from "@/components/countries/country-form-dialog"
import { CountriesTable } from "@/components/countries/countries-table"
import { CountryViewModal } from "@/components/countries/country-view-modal"
import { Id } from "@/convex/_generated/dataModel"

export function CountriesClient() {
  const t = useTranslations('Countries')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"countries"> | null>(null)
  const [viewingId, setViewingId] = useState<Id<"countries"> | null>(null)

  const countries = useQuery(api.countries.list, {}) ?? []
  const deleteCountry = useMutation(api.countries.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('countries') }
  ]

  const handleView = (id: Id<"countries">) => {
    setViewingId(id)
  }

  const handleEdit = (id: Id<"countries">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"countries">) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deleteCountry({ id })
      } catch (error) {
        console.error("Error deleting country:", error)
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

        <CountriesTable
          countries={countries}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {viewingId && (
          <CountryViewModal
            countryId={viewingId}
            open={true}
            onOpenChange={(open) => !open && setViewingId(null)}
            onEdit={() => {
              setEditingId(viewingId)
              setViewingId(null)
            }}
          />
        )}

        <CountryFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {editingId && (
          <CountryFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            countryId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
