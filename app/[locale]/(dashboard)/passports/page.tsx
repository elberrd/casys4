"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PassportFormDialog } from "@/components/passports/passport-form-dialog"
import { PassportsTable } from "@/components/passports/passports-table"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"

export default function PassportsPage() {
  const t = useTranslations('Passports')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"passports"> | null>(null)

  const passports = useQuery(api.passports.list, {}) ?? []
  const deletePassport = useMutation(api.passports.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('peopleCompanies') },
    { label: tBreadcrumbs('passports') }
  ]

  const handleEdit = (id: Id<"passports">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"passports">) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deletePassport({ id })
      } catch (error) {
        console.error("Error deleting passport:", error)
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
          <Button onClick={() => router.push('/passports/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon('create')}
          </Button>
        </div>

        <PassportsTable
          passports={passports}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <PassportFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {editingId && (
          <PassportFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            passportId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
