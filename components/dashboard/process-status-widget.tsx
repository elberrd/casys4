"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

export function ProcessStatusWidget() {
  const t = useTranslations("Dashboard")
  const tProcesses = useTranslations("IndividualProcesses")

  const stats = useQuery(api.dashboard.getProcessStats)

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("processStats")}</CardTitle>
          <CardDescription>{t("processStatsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const statusColors: Record<string, string> = {
    draft: "secondary",
    in_progress: "default",
    documentation_pending: "outline",
    under_review: "outline",
    approved: "default",
    completed: "default",
    cancelled: "destructive",
  }

  const sortedStatuses = Object.entries(stats.statusCounts).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("processStats")}</CardTitle>
        <CardDescription>{t("processStatsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("totalProcesses")}</span>
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>

          <div className="space-y-2">
            {sortedStatuses.map(([status, count]) => {
              const percentage = stats.statusPercentages[status] || 0
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColors[status] as any || "outline"}>
                        {tProcesses(`statuses.${status}`)}
                      </Badge>
                    </div>
                    <span className="font-medium">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
