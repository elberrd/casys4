"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField, createBadgeField } from "@/lib/entity-view-helpers"
import { Bell, Info, Link as LinkIcon, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface NotificationViewModalProps {
  notificationId: Id<"notifications">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function NotificationViewModal({
  notificationId,
  open,
  onOpenChange,
  onEdit,
}: NotificationViewModalProps) {
  const t = useTranslations("Notifications")
  const tCommon = useTranslations("Common")
  const router = useRouter()

  const notification = useQuery(api.notifications.get, { id: notificationId })

  if (!notification) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("notificationDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("notificationInformation"),
      icon: <Bell className="h-5 w-5" />,
      fields: [
        createField(t("title"), notification.title),
        createBadgeField(t("type"), notification.type, "outline"),
        createField(t("message"), notification.message, undefined, {
          fullWidth: true,
        }),
      ],
    },
    {
      title: t("status"),
      icon: <CheckCircle className="h-5 w-5" />,
      fields: [
        createBadgeField(
          t("readStatus"),
          notification.isRead ? t("read") : t("unread"),
          notification.isRead ? "default" : "secondary"
        ),
        createField(t("readAt"), notification.readAt, "datetime"),
        createField(t("createdAt"), notification.createdAt, "datetime"),
      ],
    },
  ]

  // Add Entity Link section if entity information exists
  if (notification.entityType && notification.entityId) {
    sections.push({
      title: t("relatedEntity"),
      icon: <LinkIcon className="h-5 w-5" />,
      fields: [
        createField(t("entityType"), notification.entityType),
        {
          label: t("entityLink"),
          value: (
            <button
              onClick={() => {
                // Navigate to the entity based on type
                const entityPath = getEntityPath(notification.entityType, notification.entityId!)
                if (entityPath) {
                  router.push(entityPath)
                  onOpenChange(false)
                }
              }}
              className="text-primary hover:underline text-left"
            >
              {t("viewEntity")}
            </button>
          ),
          icon: <LinkIcon className="h-4 w-4" />,
        },
      ],
    })
  }

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("notificationDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={notification}
    />
  )
}

// Helper function to get entity path based on type
function getEntityPath(entityType: string | undefined, entityId: string): string | null {
  if (!entityType) return null

  const entityTypeMap: Record<string, string> = {
    collectiveProcess: "/collective-processes",
    individualProcess: "/individual-processes",
    task: "/tasks",
    document: "/documents",
    person: "/people",
    company: "/companies",
  }

  const basePath = entityTypeMap[entityType]
  return basePath ? `${basePath}/${entityId}` : null
}
