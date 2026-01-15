"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations, useLocale } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField, createJsonField } from "@/lib/entity-view-helpers"
import { Activity, User, Clock, Info, Globe, Monitor } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"

interface ActivityLogViewModalProps {
  activityLogId: Id<"activityLogs">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

// Helper to get action badge style
const getActionStyle = (action: string): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } => {
  switch (action) {
    case "created":
      return { variant: "default", className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20" }
    case "updated":
      return { variant: "secondary", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20" }
    case "deleted":
      return { variant: "destructive", className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20" }
    case "approved":
    case "completed":
      return { variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" }
    case "rejected":
    case "cancelled":
      return { variant: "destructive", className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20" }
    case "status_changed":
    case "status_added":
      return { variant: "outline", className: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20" }
    default:
      return { variant: "outline", className: "" }
  }
}

export function ActivityLogViewModal({
  activityLogId,
  open,
  onOpenChange,
  onEdit,
}: ActivityLogViewModalProps) {
  const t = useTranslations("ActivityLogs")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const dateLocale = locale === "pt" ? ptBR : enUS

  const activityLog = useQuery(api.activityLogs.get, { id: activityLogId })

  if (!activityLog) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("activityLogDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const actionStyle = getActionStyle(activityLog.action)
  const createdDate = new Date(activityLog.createdAt)

  const sections: ViewSection[] = [
    {
      title: t("activityInformation"),
      icon: <Activity className="h-5 w-5" />,
      fields: [
        {
          label: t("action"),
          value: (
            <Badge variant={actionStyle.variant} className={actionStyle.className}>
              {t(`actions.${activityLog.action}`, { defaultValue: activityLog.action })}
            </Badge>
          ),
        },
        createField(
          t("entityType"),
          t(`entityTypes.${activityLog.entityType}`, { defaultValue: activityLog.entityType })
        ),
        {
          label: t("entityId"),
          value: (
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
              {activityLog.entityId}
            </code>
          ),
          fullWidth: true,
        },
      ],
    },
    {
      title: t("userInformation"),
      icon: <User className="h-5 w-5" />,
      fields: [
        {
          label: t("ipAddress"),
          value: activityLog.ipAddress ? (
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {activityLog.ipAddress}
            </code>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
          icon: <Globe className="h-3.5 w-3.5" />,
        },
        {
          label: t("userAgent"),
          value: activityLog.userAgent ? (
            <span className="text-xs text-muted-foreground break-all">
              {activityLog.userAgent}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
          icon: <Monitor className="h-3.5 w-3.5" />,
          fullWidth: true,
        },
      ],
    },
  ]

  // Add Details section if details exist
  if (activityLog.details && Object.keys(activityLog.details).length > 0) {
    sections.push({
      title: t("details"),
      icon: <Info className="h-5 w-5" />,
      fields: [
        createJsonField(t("details"), activityLog.details, { fullWidth: true }),
      ],
    })
  }

  // Add Timestamp section
  sections.push({
    title: t("timestamp"),
    icon: <Clock className="h-5 w-5" />,
    fields: [
      {
        label: t("createdAt"),
        value: (
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              {createdDate.toLocaleString(locale === "pt" ? "pt-BR" : "en-US", {
                dateStyle: "long",
                timeStyle: "medium",
              })}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(createdDate, { addSuffix: true, locale: dateLocale })}
            </span>
          </div>
        ),
        fullWidth: true,
      },
    ],
  })

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("activityLogDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={activityLog}
    />
  )
}
