"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField, createJsonField, createRelationshipField } from "@/lib/entity-view-helpers"
import { Activity, User, Globe, Clock, Info } from "lucide-react"

interface ActivityLogViewModalProps {
  activityLogId: Id<"activityLogs">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function ActivityLogViewModal({
  activityLogId,
  open,
  onOpenChange,
  onEdit,
}: ActivityLogViewModalProps) {
  const t = useTranslations("ActivityLogs")
  const tCommon = useTranslations("Common")

  const activityLog = useQuery(api.activityLogs.get, { id: activityLogId })

  if (!activityLog) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("activityLogDetails")}
        sections={[]}
        size="xl"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("activityInformation"),
      icon: <Activity className="h-5 w-5" />,
      fields: [
        createField(t("action"), activityLog.action),
        createField(t("entityType"), activityLog.entityType),
        createField(t("entityId"), activityLog.entityId),
      ],
    },
    {
      title: t("userInformation"),
      icon: <User className="h-5 w-5" />,
      fields: [
        createField(t("ipAddress"), activityLog.ipAddress),
        createField(t("userAgent"), activityLog.userAgent, undefined, {
          fullWidth: true,
        }),
      ],
    },
  ]

  // Add Details section if details exist
  if (activityLog.details) {
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
      createField(t("createdAt"), activityLog.createdAt, "datetime"),
    ],
  })

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("activityLogDetails")}
      sections={sections}
      onEdit={onEdit}
      size="xl"
      entity={activityLog}
    />
  )
}
