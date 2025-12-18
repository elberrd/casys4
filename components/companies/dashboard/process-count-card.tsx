"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText } from "lucide-react"

interface ProcessCountCardProps {
  companyId: Id<"companies">
}

export function ProcessCountCard({ companyId }: ProcessCountCardProps) {
  const t = useTranslations('Companies.dashboard')

  const stats = useQuery(api.companies.getCompanyDashboardStats, { companyId })

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('processesOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('processesOverview')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Individual Processes */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalIndividualProcesses}</p>
              <p className="text-sm text-muted-foreground">{t('totalIndividual')}</p>
            </div>
          </div>

          {/* Collective Processes */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalCollectiveProcesses}</p>
              <p className="text-sm text-muted-foreground">{t('totalCollective')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
