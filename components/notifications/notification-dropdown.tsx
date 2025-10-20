"use client"

import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { NotificationItem } from "./notification-item"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CheckCheck, ExternalLink } from "lucide-react"
import { useRouter } from "@/i18n/routing"

export interface NotificationDropdownProps {
  onClose?: () => void
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const t = useTranslations("Notifications")
  const router = useRouter()
  const notifications = useQuery(api.notifications.getUserNotifications, {
    limit: 10,
  })
  const markAllAsRead = useMutation(api.notifications.markAllAsRead)

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }

  const handleViewAll = () => {
    router.push("/notifications")
    onClose?.()
  }

  if (!notifications) {
    return (
      <div className="w-80 p-4">
        <p className="text-sm text-muted-foreground text-center">
          {t("loading")}
        </p>
      </div>
    )
  }

  const hasUnread = notifications.some((n) => !n.isRead)

  return (
    <div className="w-80 max-w-[calc(100vw-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="font-semibold text-sm">{t("notifications")}</h3>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={handleMarkAllAsRead}
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            {t("markAllAsRead")}
          </Button>
        )}
      </div>

      <Separator className="my-2" />

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("noNotifications")}
          </p>
        </div>
      ) : (
        <>
          <ScrollArea className="max-h-[400px]">
            <div className="px-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  compact
                  onClick={onClose}
                />
              ))}
            </div>
          </ScrollArea>

          <Separator className="my-2" />

          {/* Footer */}
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={handleViewAll}
            >
              {t("viewAll")}
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
