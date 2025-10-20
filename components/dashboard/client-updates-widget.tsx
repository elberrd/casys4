"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Activity } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { useLocale } from "next-intl"

export function ClientUpdatesWidget() {
  const t = useTranslations("Dashboard")
  const tProcesses = useTranslations("IndividualProcesses")
  const locale = useLocale()

  const activities = useQuery(api.dashboard.getRecentActivity)

  if (!activities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("recentUpdates")}</CardTitle>
          <CardDescription>{t("recentUpdatesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const displayedActivities = activities.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentUpdates")}</CardTitle>
        <CardDescription>{t("recentUpdatesDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t("noRecentActivity")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedActivities.map((activity) => (
              <Link
                key={activity._id}
                href={`/individual-processes/${activity.individualProcessId}`}
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium leading-none line-clamp-1">
                          {activity.person?.fullName || t("unknownPerson")}
                        </h4>
                        {activity.mainProcess && (
                          <span className="text-xs text-muted-foreground">
                            {activity.mainProcess.referenceNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">
                          {tProcesses(`statuses.${activity.newStatus}`)}
                        </Badge>
                        {activity.previousStatus && (
                          <span className="text-xs text-muted-foreground">
                            {t("from")} {tProcesses(`statuses.${activity.previousStatus}`)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t("updatedBy")} {activity.changedByUser?.fullName || t("system")}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(activity.changedAt), {
                        addSuffix: true,
                        locale: locale === "pt" ? ptBR : enUS,
                      })}
                    </span>
                  </div>
                  {activity.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {activity.notes}
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {activities.length > displayedActivities.length && (
              <div className="pt-2 text-center">
                <Link
                  href="/individual-processes"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  +{activities.length - displayedActivities.length} {t("moreUpdates")}
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
