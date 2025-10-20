"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar } from "lucide-react"
import Link from "next/link"

export function UpcomingDeadlinesWidget() {
  const t = useTranslations("Dashboard")
  const tProcesses = useTranslations("IndividualProcesses")

  const deadlines = useQuery(api.dashboard.getUpcomingDeadlines)

  if (!deadlines) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("upcomingDeadlines")}</CardTitle>
          <CardDescription>{t("upcomingDeadlinesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const getUrgencyVariant = (daysRemaining: number) => {
    if (daysRemaining <= 3) return "destructive"
    if (daysRemaining <= 7) return "default"
    if (daysRemaining <= 14) return "secondary"
    return "outline"
  }

  const displayedDeadlines = deadlines.slice(0, 5)
  const remainingCount = deadlines.length - displayedDeadlines.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {t("upcomingDeadlines")}
              {deadlines.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {deadlines.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t("upcomingDeadlinesDescription")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t("noUpcomingDeadlines")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedDeadlines.map((deadline) => {
              const urgencyVariant = getUrgencyVariant(deadline.daysRemaining)

              return (
                <Link
                  key={deadline._id}
                  href={`/individual-processes/${deadline._id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium leading-none">
                          {deadline.person?.fullName || t("unknownPerson")}
                        </h4>
                        <Badge variant={urgencyVariant} className="shrink-0">
                          {t("daysRemaining", { count: deadline.daysRemaining })}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {deadline.mainProcess && (
                          <span>{deadline.mainProcess.referenceNumber}</span>
                        )}
                        {deadline.processType && (
                          <span>{deadline.processType.name}</span>
                        )}
                        <span>
                          {t("deadline")}: {deadline.deadlineDate}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {tProcesses(`statuses.${deadline.status}`)}
                    </Badge>
                  </div>
                </Link>
              )
            })}

            {remainingCount > 0 && (
              <div className="pt-2 text-center">
                <Link
                  href="/individual-processes?filter=upcoming_deadlines"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  +{remainingCount} {t("moreDeadlines")}
                </Link>
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/individual-processes?filter=upcoming_deadlines"
                className="block w-full rounded-md border border-primary bg-primary/5 px-4 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                {t("viewAll")}
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
