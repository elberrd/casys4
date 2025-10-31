"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { ConsulatesTable } from "@/components/consulates/consulates-table"
import { useTranslations } from "next-intl"

export function ConsulatesClient() {
  const t = useTranslations('Consulates')
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('supportData') },
    { label: tBreadcrumbs('consulates') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <ConsulatesTable />
      </div>
    </>
  )
}
