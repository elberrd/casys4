"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { NotificationsTable } from "@/components/notifications/notifications-table"
import { NotificationViewModal } from "@/components/notifications/notification-view-modal"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "@/i18n/routing"

export function NotificationsClient() {
  const t = useTranslations("Notifications")
  const tCommon = useTranslations("Common")
  const { toast } = useToast()
  const router = useRouter()

  const [viewingNotification, setViewingNotification] = useState<Id<"notifications"> | undefined>()

  const notifications = useQuery(api.notifications.getUserNotifications, {
    limit: 100,
  })
  const markAsRead = useMutation(api.notifications.markAsRead)
  const markAllAsRead = useMutation(api.notifications.markAllAsRead)
  const deleteNotification = useMutation(api.notifications.deleteNotification)

  const handleView = async (id: Id<"notifications">) => {
    setViewingNotification(id)
    const notification = notifications?.find((n) => n._id === id)
    if (!notification) return

    // Mark as read when viewing
    if (!notification.isRead) {
      try {
        await markAsRead({ notificationId: id })
      } catch (error) {
        console.error("Failed to mark notification as read:", error)
      }
    }
  }

  const handleDelete = async (id: Id<"notifications">) => {
    try {
      await deleteNotification({ notificationId: id })
      toast({
        title: tCommon("success"),
        description: t("notificationDeleted"),
      })
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: tCommon("somethingWentWrong"),
        variant: "destructive",
      })
    }
  }

  const handleMarkAsRead = async (id: Id<"notifications">) => {
    try {
      await markAsRead({ notificationId: id })
      toast({
        title: tCommon("success"),
        description: t("markedAsRead"),
      })
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: tCommon("somethingWentWrong"),
        variant: "destructive",
      })
    }
  }

  const handleBulkDelete = async (ids: Id<"notifications">[]) => {
    try {
      await Promise.all(ids.map((id) => deleteNotification({ notificationId: id })))
      toast({
        title: tCommon("success"),
        description: t("notificationsDeleted", { count: ids.length }),
      })
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: tCommon("somethingWentWrong"),
        variant: "destructive",
      })
    }
  }

  const handleBulkMarkAsRead = async (ids: Id<"notifications">[]) => {
    try {
      await Promise.all(
        ids.map((id) => {
          const notification = notifications?.find((n) => n._id === id)
          if (notification && !notification.isRead) {
            return markAsRead({ notificationId: id })
          }
          return Promise.resolve()
        })
      )
      toast({
        title: tCommon("success"),
        description: t("notificationsMarkedAsRead", { count: ids.length }),
      })
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: tCommon("somethingWentWrong"),
        variant: "destructive",
      })
    }
  }

  const breadcrumbs = [
    { label: t("notifications"), href: "/notifications" },
  ]

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-bold">{t("notifications")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          {!notifications ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
            </div>
          ) : (
            <NotificationsTable
              notifications={notifications}
              onView={handleView}
              onDelete={handleDelete}
              onMarkAsRead={handleMarkAsRead}
              onBulkDelete={handleBulkDelete}
              onBulkMarkAsRead={handleBulkMarkAsRead}
            />
          )}
        </div>
      </div>

      {viewingNotification && (
        <NotificationViewModal
          notificationId={viewingNotification}
          open={true}
          onOpenChange={(open) => !open && setViewingNotification(undefined)}
        />
      )}
    </>
  )
}
