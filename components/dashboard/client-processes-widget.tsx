"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText } from "lucide-react"
import Link from "next/link"

export function ClientProcessesWidget() {
  const t = useTranslations("Dashboard")
  const tProcesses = useTranslations("IndividualProcesses")

  const stats = useQuery(api.dashboard.getProcessStats)

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("yourProcesses")}</CardTitle>
          <CardDescription>{t("yourProcessesDescription")}</CardDescription>
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

  const mainStatuses = ["in_progress", "documentation_pending", "under_review", "completed"]
  const displayedStatuses = mainStatuses
    .filter((status) => stats.statusCounts[status]?.count > 0)
    .map((status) => ({
      status,
      count: stats.statusCounts[status]?.count || 0,
      percentage: stats.statusPercentages[status] || 0,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("yourProcesses")}</CardTitle>
        <CardDescription>{t("yourProcessesDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Count */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("totalProcesses")}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
            <Link
              href="/individual-processes"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>

          {/* Status Breakdown */}
          {displayedStatuses.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t("statusBreakdown")}</h4>
              {displayedStatuses.map(({ status, count, percentage }) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[status] as any || "outline"}>
                      {tProcesses(`statuses.${status}`)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{count}</span>
                    <span className="text-muted-foreground">
                      ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {stats.total === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t("noProcessesYet")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
