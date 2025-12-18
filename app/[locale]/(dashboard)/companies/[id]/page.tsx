"use client"

import { useParams } from "next/navigation"
import { Id } from "@/convex/_generated/dataModel"
import { CompanyDashboardPage } from "@/components/companies/company-dashboard-page"

export default function CompanyDetailPage() {
  const params = useParams()
  const companyId = params.id as Id<"companies">

  return <CompanyDashboardPage companyId={companyId} />
}
