"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { useTranslations } from "next-intl"
import { Clock, User, FileText, Calendar } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { useLocale } from "next-intl"

interface StatusHistoryTimelineProps {
  individualProcessId: Id<"individualProcesses">
}

export function StatusHistoryTimeline({ individualProcessId }: StatusHistoryTimelineProps) {
  const t = useTranslations('IndividualProcesses')
  const locale = useLocale()

  const statusHistory = useQuery(
    api.individualProcessStatuses.getStatusHistory,
    { individualProcessId }
  )

  if (statusHistory === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('statusHistory')}</CardTitle>
          <CardDescription>{t('statusHistoryDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">
              {t('loading')}...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!statusHistory || statusHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('statusHistory')}</CardTitle>
          <CardDescription>{t('statusHistoryDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {t('noStatusHistory')}
          </div>
        </CardContent>
      </Card>
    )
  }

  const dateLocale = locale === 'pt' ? ptBR : enUS

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('statusHistory')}</CardTitle>
        <CardDescription>{t('statusHistoryDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {statusHistory.map((status, index) => {
            const isActive = status.isActive
            const isLast = index === statusHistory.length - 1

            // Get case status name in correct locale
            const caseStatus = status.caseStatus
            const statusName = caseStatus
              ? (locale === "en" && caseStatus.nameEn ? caseStatus.nameEn : caseStatus.name)
              : status.statusName // Fallback to statusName for backward compatibility

            return (
              <div key={status._id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted bg-background"
                }`}>
                  {isActive ? (
                    <div className="h-3 w-3 rounded-full bg-primary-foreground" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 ${!isLast ? "pb-6" : ""}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={statusName}
                        type="individual_process"
                        color={caseStatus?.color}
                        category={caseStatus?.category}
                      />
                      {isActive && (
                        <Badge variant="default" className="text-xs">
                          {t('activeStatus')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(status.changedAt, {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Status Date */}
                  {status.date && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="font-medium">{t('statusDate')}:</span>
                      <span>
                        {format(new Date(status.date), 'PPP', { locale: dateLocale })}
                      </span>
                    </div>
                  )}

                  {status.notes && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border bg-muted/50 p-3">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{status.notes}</p>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="opacity-75">{locale === 'pt' ? 'Registrado em:' : 'Recorded at:'}</span>{' '}
                    {new Date(status.changedAt).toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
