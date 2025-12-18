"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scale } from "lucide-react"

interface LegalFrameworksCardProps {
  companyId: Id<"companies">
}

export function LegalFrameworksCard({ companyId }: LegalFrameworksCardProps) {
  const t = useTranslations('Companies.dashboard')

  const distribution = useQuery(api.companies.getCompanyLegalFrameworkDistribution, { companyId })

  if (!distribution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {t('legalFrameworks')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (distribution.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {t('legalFrameworks')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">{t('noProcesses')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Generate distinct colors for different frameworks
  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#8b5cf6", // purple
    "#f59e0b", // orange
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#6366f1", // indigo
    "#14b8a6", // teal
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          {t('legalFrameworks')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {distribution.map((framework, index) => {
            const color = colors[index % colors.length]
            return (
              <div key={framework.legalFrameworkId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate flex-1 mr-2">
                    {framework.legalFrameworkName}
                  </span>
                  <Badge variant="secondary">
                    {framework.count} ({framework.percentage}%)
                  </Badge>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${framework.percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
