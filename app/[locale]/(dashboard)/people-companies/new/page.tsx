"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { PersonCompanyFormPage } from "@/components/people-companies/person-company-form-page"
import { useTranslations } from "next-intl"

export default function NewPersonCompanyPage() {
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tPeopleCompanies = useTranslations('PeopleCompanies')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('peopleCompanies') },
    { label: tBreadcrumbs('peopleCompaniesRelationships'), href: "/people-companies" },
    { label: tBreadcrumbs('newRelationship') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <PersonCompanyFormPage />
      </div>
    </>
  )
}
