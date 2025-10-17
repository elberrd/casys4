"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { CompanyFormPage } from "@/components/companies/company-form-page"
import { useTranslations } from "next-intl"

export default function NewCompanyPage() {
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCompanies = useTranslations('Companies')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('peopleCompanies') },
    { label: tBreadcrumbs('companies'), href: "/companies" },
    { label: tBreadcrumbs('newCompany') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <CompanyFormPage />
      </div>
    </>
  )
}
