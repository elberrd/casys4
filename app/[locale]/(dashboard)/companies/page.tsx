"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CompanyFormDialog } from "@/components/companies/company-form-dialog"
import { CompaniesTable } from "@/components/companies/companies-table"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"

export default function CompaniesPage() {
  const t = useTranslations('Companies')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [editingId, setEditingId] = useState<Id<"companies"> | null>(null)

  const companies = useQuery(api.companies.list, {}) ?? []
  const deleteCompany = useMutation(api.companies.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('peopleCompanies') },
    { label: tBreadcrumbs('companies') }
  ]

  const handleEdit = (id: Id<"companies">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"companies">) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deleteCompany({ id })
      } catch (error) {
        console.error("Error deleting company:", error)
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
          <Button onClick={() => router.push('/companies/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon('create')}
          </Button>
        </div>

        <CompaniesTable
          companies={companies}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {editingId && (
          <CompanyFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            companyId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
