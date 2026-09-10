"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CompanyGroupFormDialog } from "@/components/company-groups/company-group-form-dialog"
import { CompanyGroupsTable } from "@/components/company-groups/company-groups-table"
import { Id } from "@/convex/_generated/dataModel"

export function CompanyGroupsClient() {
  const t = useTranslations("CompanyGroups")
  const tBreadcrumbs = useTranslations("Breadcrumbs")
  const tCommon = useTranslations("Common")

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"companyGroups"> | null>(null)

  const companyGroups = useQuery(api.companyGroups.list, {}) ?? []
  const deleteCompanyGroup = useMutation(api.companyGroups.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("supportData") },
    { label: tBreadcrumbs("companyGroups") },
  ]

  const handleEdit = (id: Id<"companyGroups">) => {
    setEditingId(id)
  }

  const handleDelete = async (id: Id<"companyGroups">) => {
    try {
      await deleteCompanyGroup({ id })
    } catch (error) {
      console.error("Error deleting company group:", error)
      throw error
    }
  }

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon("create")}
          </Button>
        </div>

        <CompanyGroupsTable
          companyGroups={companyGroups}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <CompanyGroupFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
        />

        {editingId && (
          <CompanyGroupFormDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            companyGroupId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}
      </div>
    </>
  )
}
