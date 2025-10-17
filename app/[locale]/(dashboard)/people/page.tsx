"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"

export default function PeoplePage() {
  const t = useTranslations('People')
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('peopleCompanies') },
    { label: tBreadcrumbs('people') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {/* Page content will be added here */}
      </div>
    </>
  )
}
