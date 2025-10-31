"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { useLocale } from "next-intl"

export function OverdueTasksWidget() {
  const t = useTranslations("Dashboard")
  const tTasks = useTranslations("Tasks")
  const locale = useLocale()

  const tasks = useQuery(api.dashboard.getOverdueTasks)

  if (!tasks) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("overdueTasks")}</CardTitle>
          <CardDescription>{t("overdueTasksDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const calculateDaysOverdue = (dueDate?: string) => {
    if (!dueDate) return 0;
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = today.getTime() - due.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const displayedTasks = tasks.slice(0, 5)
  const remainingCount = tasks.length - displayedTasks.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {t("overdueTasks")}
              {tasks.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {tasks.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t("overdueTasksDescription")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t("noOverdueTasks")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTasks.map((task) => {
              const daysOverdue = calculateDaysOverdue(task.dueDate)
              const urgencyLevel =
                daysOverdue > 7 ? "high" : daysOverdue > 3 ? "medium" : "low"

              return (
                <Link
                  key={task._id}
                  href={`/tasks/${task._id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium leading-none line-clamp-1">
                          {task.title}
                        </h4>
                        <Badge
                          variant={
                            urgencyLevel === "high"
                              ? "destructive"
                              : urgencyLevel === "medium"
                              ? "default"
                              : "outline"
                          }
                          className="shrink-0"
                        >
                          {t("daysOverdue", { count: daysOverdue })}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {task.assignedToUser && (
                          <span>{task.assignedToUser.fullName}</span>
                        )}
                        {task.mainProcess && (
                          <span>{task.mainProcess.referenceNumber}</span>
                        )}
                        {task.person && <span>{task.person.fullName}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {tTasks(`statuses.${task.status}`)}
                    </Badge>
                  </div>
                </Link>
              )
            })}

            {remainingCount > 0 && (
              <div className="pt-2 text-center">
                <Link
                  href="/tasks?filter=overdue"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  +{remainingCount} {t("moreTasks")}
                </Link>
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/tasks?filter=overdue"
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
