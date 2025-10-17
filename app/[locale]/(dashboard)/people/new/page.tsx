"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { PersonFormPage } from "@/components/people/person-form-page"
import { useTranslations } from "next-intl"

export default function NewPersonPage() {
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tPeople = useTranslations('People')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('peopleCompanies') },
    { label: tBreadcrumbs('people'), href: "/people" },
    { label: tBreadcrumbs('newPerson') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <PersonFormPage />
      </div>
    </>
  )
}
