"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"

export function CompletionRateWidget() {
  const t = useTranslations("Dashboard")

  const stats = useQuery(api.dashboard.getProcessCompletionRate)

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("completionRate")}</CardTitle>
          <CardDescription>{t("completionRateDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = (rate: number) => {
    if (rate >= 70) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (rate >= 40) return <Minus className="h-4 w-4 text-yellow-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const getTrendColor = (rate: number) => {
    if (rate >= 70) return "text-green-600"
    if (rate >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusVariant = (rate: number) => {
    if (rate >= 70) return "default"
    if (rate >= 40) return "secondary"
    return "destructive"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("completionRate")}</CardTitle>
        <CardDescription>{t("completionRateDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main Completion Rate */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("last30Days")}</p>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold">
                  {stats.completionRate.toFixed(1)}%
                </span>
                {getTrendIcon(stats.completionRate)}
              </div>
            </div>
            <Badge variant={getStatusVariant(stats.completionRate)} className="h-fit">
              {stats.completionRate >= 70
                ? t("excellent")
                : stats.completionRate >= 40
                ? t("good")
                : t("needsImprovement")}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("completionProgress")}</span>
              <span className="font-medium">
                {stats.completedProcesses} / {stats.totalProcesses}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${
                  stats.completionRate >= 70
                    ? "bg-green-600"
                    : stats.completionRate >= 40
                    ? "bg-yellow-600"
                    : "bg-red-600"
                }`}
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("totalProcesses")}</p>
              <p className="text-2xl font-bold">{stats.totalProcesses}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("completed")}</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.completedProcesses}
              </p>
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-xs text-muted-foreground">
                {t("averageDaysToComplete")}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{stats.averageDaysToComplete}</p>
                <p className="text-sm text-muted-foreground">{t("days")}</p>
              </div>
            </div>
          </div>

          {/* Interpretation */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              {stats.completionRate >= 70
                ? t("completionRateExcellentMessage")
                : stats.completionRate >= 40
                ? t("completionRateGoodMessage")
                : t("completionRateNeedsImprovementMessage")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
