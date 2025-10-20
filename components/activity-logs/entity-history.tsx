"use client"

import { useTranslations, useLocale } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { Plus, Edit, Trash2, CheckCircle, UserPlus, Calendar, FileText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface EntityHistoryProps {
  entityType: string
  entityId: string
  title?: string
}

export function EntityHistory({
  entityType,
  entityId,
  title,
}: EntityHistoryProps) {
  const t = useTranslations('ActivityLogs')
  const tCommon = useTranslations('Common')
  const locale = useLocale()

  const history = useQuery(api.activityLogs.getEntityHistory, {
    entityType,
    entityId,
  })

  // Helper to get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <Plus className="h-4 w-4" />
      case "updated":
        return <Edit className="h-4 w-4" />
      case "deleted":
        return <Trash2 className="h-4 w-4" />
      case "approved":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
        return <Trash2 className="h-4 w-4" />
      case "assigned":
      case "reassigned":
        return <UserPlus className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "status_changed":
        return <Calendar className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Helper to get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case "created":
        return "text-blue-600 dark:text-blue-400"
      case "updated":
        return "text-yellow-600 dark:text-yellow-400"
      case "deleted":
        return "text-red-600 dark:text-red-400"
      case "approved":
        return "text-green-600 dark:text-green-400"
      case "rejected":
        return "text-red-600 dark:text-red-400"
      case "completed":
        return "text-green-600 dark:text-green-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  // Helper to get user initials
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Helper to format action message
  const formatActionMessage = (log: any) => {
    const action = t(`actions.${log.action}`, { defaultValue: log.action })
    const user = log.user?.fullName || tCommon('unknown')

    if (log.details?.statusFrom && log.details?.statusTo) {
      return t('statusChangedMessage', {
        user,
        from: log.details.statusFrom,
        to: log.details.statusTo,
      })
    }

    return `${user} ${action.toLowerCase()}`
  }

  if (history === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || t('entityHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || t('entityHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('noHistoryFound')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const dateLocale = locale === "pt" ? ptBR : enUS

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || t('entityHistory')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            {/* Timeline items */}
            <div className="space-y-6">
              {history.map((log, index) => (
                <div key={log._id} className="relative flex gap-3">
                  {/* Avatar */}
                  <div className="relative z-10">
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarFallback className={getActionColor(log.action)}>
                        {log.user?.fullName
                          ? getUserInitials(log.user.fullName)
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Icon badge */}
                    <div className={`absolute -bottom-1 -right-1 rounded-full bg-background p-1 ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {formatActionMessage(log)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </p>
                        {log.details?.message && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {log.details.message}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {t(`actions.${log.action}`, { defaultValue: log.action })}
                      </Badge>
                    </div>

                    {/* Additional details */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-3 p-3 bg-muted rounded-md text-xs">
                        {log.details.statusFrom && log.details.statusTo && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {log.details.statusFrom}
                            </Badge>
                            <span>→</span>
                            <Badge variant="default" className="text-xs">
                              {log.details.statusTo}
                            </Badge>
                          </div>
                        )}
                        {log.details.documentType && (
                          <p className="mt-1">
                            <span className="font-semibold">{t('documentType')}:</span>{" "}
                            {log.details.documentType}
                          </p>
                        )}
                        {log.details.taskTitle && (
                          <p className="mt-1">
                            <span className="font-semibold">{t('taskTitle')}:</span>{" "}
                            {log.details.taskTitle}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
