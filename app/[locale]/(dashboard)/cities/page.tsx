"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"

export default function CitiesPage() {
  const t = useTranslations('Cities')
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('cities') }
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
