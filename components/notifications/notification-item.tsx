"use client"

import { useTranslations } from "next-intl"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { useLocale } from "next-intl"
import { Bell, CheckCircle, FileCheck, ListTodo, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "@/i18n/routing"

export interface NotificationItemProps {
  notification: {
    _id: Id<"notifications">
    type: string
    title: string
    message: string
    isRead: boolean
    createdAt: number
    entityType?: string
    entityId?: string
  }
  compact?: boolean
  onClick?: () => void
}

const notificationIcons = {
  status_change: CheckCircle,
  document_approved: FileCheck,
  document_rejected: AlertCircle,
  task_assigned: ListTodo,
  process_milestone: Bell,
  default: Bell,
}

export function NotificationItem({ notification, compact = false, onClick }: NotificationItemProps) {
  const t = useTranslations("Notifications")
  const locale = useLocale()
  const router = useRouter()
  const markAsRead = useMutation(api.notifications.markAsRead)

  const dateLocale = locale === "pt" ? ptBR : enUS
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: dateLocale,
  })

  const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || notificationIcons.default

  const handleClick = async () => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await markAsRead({ notificationId: notification._id })
      } catch (error) {
        console.error("Failed to mark notification as read:", error)
      }
    }

    // Navigate to entity if available
    if (notification.entityType && notification.entityId) {
      const entityRoutes: Record<string, string> = {
        mainProcess: `/main-processes/${notification.entityId}`,
        individualProcess: `/individual-processes/${notification.entityId}`,
        task: `/tasks/${notification.entityId}`,
        document: `/individual-processes/${notification.entityId}`,
      }

      const route = entityRoutes[notification.entityType]
      if (route) {
        router.push(route)
      }
    }

    // Call custom onClick if provided
    onClick?.()
  }

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        !notification.isRead && "bg-muted/50",
        "hover:bg-muted",
        compact && "p-2"
      )}
      onClick={handleClick}
    >
      <div className={cn("flex-shrink-0 mt-1", compact && "mt-0")}>
        <div
          className={cn(
            "rounded-full p-2",
            notification.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className={cn("h-4 w-4", compact && "h-3 w-3")} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("font-medium text-sm", !notification.isRead && "font-semibold")}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />
          )}
        </div>

        {!compact && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-1">
          {timeAgo}
        </p>
      </div>
    </div>
  )
}
