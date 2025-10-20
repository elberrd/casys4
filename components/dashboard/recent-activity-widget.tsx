"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Activity } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { useLocale } from "next-intl"

export function RecentActivityWidget() {
  const t = useTranslations("Dashboard")
  const locale = useLocale()

  const activities = useQuery(api.dashboard.getRecentActivity)
  const dateLocale = locale === "pt" ? ptBR : enUS

  if (!activities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("recentActivity")}</CardTitle>
          <CardDescription>{t("recentActivityDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentActivity")}</CardTitle>
        <CardDescription>{t("recentActivityDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">{t("noRecentActivity")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const timeAgo = formatDistanceToNow(new Date(activity.changedAt), {
                addSuffix: true,
                locale: dateLocale,
              })

              const statusChange = activity.previousStatus
                ? `${activity.person?.fullName || "Unknown"}: ${activity.previousStatus} → ${activity.newStatus}`
                : `${activity.person?.fullName || "Unknown"}: ${activity.newStatus}`

              return (
                <div key={activity._id} className="flex gap-3 border-l-2 border-muted pl-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{statusChange}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{activity.changedByUser?.fullName || "System"}</span>
                      <span>•</span>
                      <span>{timeAgo}</span>
                    </div>
                    {activity.notes && (
                      <p className="text-xs text-muted-foreground">{activity.notes}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
