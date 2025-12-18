"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { CompanyFormDialog } from "@/components/companies/company-form-dialog"
import { CompanyInfoCard } from "@/components/companies/dashboard/company-info-card"
import { ProcessCountCard } from "@/components/companies/dashboard/process-count-card"
import { StatusDistributionCard } from "@/components/companies/dashboard/status-distribution-card"
import { AuthorizationTypesCard } from "@/components/companies/dashboard/authorization-types-card"
import { LegalFrameworksCard } from "@/components/companies/dashboard/legal-frameworks-card"
import { MissingDataCard } from "@/components/companies/dashboard/missing-data-card"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"

interface CompanyDashboardPageProps {
  companyId: Id<"companies">
}

export function CompanyDashboardPage({ companyId }: CompanyDashboardPageProps) {
  const t = useTranslations('Companies')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const company = useQuery(api.companies.get, { id: companyId })

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: '/dashboard' },
    { label: tBreadcrumbs('peopleCompanies') },
    { label: tBreadcrumbs('companies'), href: '/companies' },
    { label: company?.name || "..." }
  ]

  // Loading state
  if (company === undefined) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{tCommon('loading')}</p>
          </div>
        </div>
      </>
    )
  }

  // Not found state
  if (company === null) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{t('notFound')}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Header with company name and edit button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.description')}
            </p>
          </div>
          <Button onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            {tCommon('edit')}
          </Button>
        </div>

        {/* Company Information Card */}
        <CompanyInfoCard companyId={companyId} />

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Process Count Overview - Spans full width */}
          <div className="lg:col-span-2">
            <ProcessCountCard companyId={companyId} />
          </div>

          {/* Status Distribution */}
          <StatusDistributionCard companyId={companyId} />

          {/* Missing Data Alert */}
          <MissingDataCard companyId={companyId} />

          {/* Authorization Types */}
          <AuthorizationTypesCard companyId={companyId} />

          {/* Legal Frameworks */}
          <LegalFrameworksCard companyId={companyId} />
        </div>
      </div>

      {/* Edit company dialog */}
      <CompanyFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        companyId={companyId}
        onSuccess={() => {
          setEditDialogOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}
