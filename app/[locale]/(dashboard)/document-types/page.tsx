"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { DocumentTypesTable } from "@/components/document-types/document-types-table"
import { useTranslations } from "next-intl"

export default function DocumentTypesPage() {
  const t = useTranslations('DocumentTypes')
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('documentTypes') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DocumentTypesTable />
      </div>
    </>
  )
}
