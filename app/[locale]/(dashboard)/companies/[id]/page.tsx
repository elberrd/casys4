"use client"

import { useParams } from "next/navigation"
import { CompanyDashboardPage } from "@/components/companies/company-dashboard-page"

export default function CompanyDetailPage() {
  const params = useParams()
  const companyId = typeof params.id === "string" ? params.id : ""

  return <CompanyDashboardPage companyId={companyId} />
}
