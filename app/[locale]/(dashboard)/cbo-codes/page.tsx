"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { CboCodesTable } from "@/components/cbo-codes/cbo-codes-table"
import { useTranslations } from "next-intl"

export default function CboCodesPage() {
  const t = useTranslations('CboCodes')
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('cboCodes') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <CboCodesTable />
      </div>
    </>
  )
}
