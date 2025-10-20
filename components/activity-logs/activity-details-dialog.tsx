"use client"

import { useTranslations, useLocale } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Id } from "@/convex/_generated/dataModel"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"

interface ActivityLog {
  _id: Id<"activityLogs">
  userId: Id<"users">
  action: string
  entityType: string
  entityId: string
  details?: any
  ipAddress?: string
  userAgent?: string
  createdAt: number
  user: {
    _id: string
    fullName: string
    email: string
  } | null
}

interface ActivityDetailsDialogProps {
  log: ActivityLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActivityDetailsDialog({
  log,
  open,
  onOpenChange,
}: ActivityDetailsDialogProps) {
  const t = useTranslations('ActivityLogs')
  const tCommon = useTranslations('Common')
  const locale = useLocale()

  if (!log) return null

  const date = new Date(log.createdAt)
  const dateLocale = locale === "pt" ? ptBR : enUS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('activityDetails')}</DialogTitle>
          <DialogDescription>
            {t('detailedInformation')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-1">{t('timestamp')}</h4>
                <p className="text-sm">{date.toLocaleString(locale === "pt" ? "pt-BR" : "en-US")}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">{t('user')}</h4>
                {log.user ? (
                  <>
                    <p className="text-sm">{log.user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{log.user.email}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{tCommon('unknown')}</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">{t('action')}</h4>
                <Badge variant="outline" className="capitalize">
                  {t(`actions.${log.action}`, { defaultValue: log.action })}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">{t('entityType')}</h4>
                <Badge variant="secondary" className="capitalize">
                  {t(`entityTypes.${log.entityType}`, { defaultValue: log.entityType })}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">{t('entityId')}</h4>
                <code className="text-xs bg-muted px-2 py-1 rounded">{log.entityId}</code>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">{t('ipAddress')}</h4>
                <p className="text-sm">{log.ipAddress || "N/A"}</p>
              </div>
            </div>

            {/* User Agent */}
            {log.userAgent && (
              <div>
                <h4 className="text-sm font-semibold mb-1">{t('userAgent')}</h4>
                <p className="text-xs text-muted-foreground break-all">{log.userAgent}</p>
              </div>
            )}

            {/* Details Section */}
            {log.details && (
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('details')}</h4>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Before/After Comparison */}
            {log.details?.before && log.details?.after && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-destructive">{t('before')}</h4>
                  <div className="bg-destructive/10 p-3 rounded-md">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(log.details.before, null, 2)}
                    </pre>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-green-600">{t('after')}</h4>
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(log.details.after, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
