"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { DocumentsTable } from "@/components/documents/documents-table"
import { useTranslations } from "next-intl"

export function DocumentsClient() {
  const t = useTranslations('Documents')
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('documents') }
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
        <DocumentsTable />
      </div>
    </>
  )
}
