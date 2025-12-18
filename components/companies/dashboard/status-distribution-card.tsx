"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusDistributionCardProps {
  companyId: Id<"companies">
}

export function StatusDistributionCard({ companyId }: StatusDistributionCardProps) {
  const t = useTranslations('Companies.dashboard')

  const statusData = useQuery(api.companies.getCompanyStatusDistribution, { companyId })

  if (!statusData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('statusDistribution')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { distribution, emPreparacaoCount, total } = statusData

  if (distribution.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('statusDistribution')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">{t('noProcesses')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('statusDistribution')}</CardTitle>
        <CardDescription>
          {t('emPreparacao')}: <strong>{emPreparacaoCount}</strong> / {t('total')}: <strong>{total}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {distribution.map((status) => (
            <div key={status.caseStatusId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", status.isEmPreparacao && "border-amber-500 text-amber-700")}
                    style={{ borderColor: status.color, color: status.color }}
                  >
                    {status.statusName}
                  </Badge>
                </div>
                <span className="font-medium">
                  {status.count} ({status.percentage}%)
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${status.percentage}%`,
                    backgroundColor: status.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
