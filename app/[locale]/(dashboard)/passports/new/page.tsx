"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { PassportFormPage } from "@/components/passports/passport-form-page"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

export default function NewPassportPage() {
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tPassports = useTranslations('Passports')
  const params = useParams()
  const locale = params.locale as string

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: '/dashboard' },
    { label: tBreadcrumbs('peopleCompanies') },
    { label: tBreadcrumbs('passports'), href: '/passports' },
    { label: tBreadcrumbs('newPassport') }
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <PassportFormPage />
      </div>
    </>
  )
}
