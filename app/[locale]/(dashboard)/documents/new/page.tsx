"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { DocumentFormPage } from "@/components/documents/document-form-page"
import { useTranslations } from "next-intl"

export default function NewDocumentPage() {
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tDocuments = useTranslations('Documents')

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('documents'), href: "/documents" },
    { label: tBreadcrumbs('newDocument') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DocumentFormPage />
      </div>
    </>
  )
}
