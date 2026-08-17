"use client";

import { formatDistanceToNow } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import {
  AlarmClock,
  Bell,
  CheckCircle,
  FileCheck,
  ListTodo,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "@/i18n/routing";
import { getNotificationTarget } from "@/lib/notification-targets";
import {
  getNotificationMessageDescriptor,
  getNotificationTitleKey,
} from "@/lib/notification-display";

export interface NotificationItemProps {
  notification: {
    _id: Id<"notifications">;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: number;
    entityType?: string;
    entityId?: string;
  };
  compact?: boolean;
  onClick?: () => void;
}

const notificationIcons = {
  status_change: CheckCircle,
  document_approved: FileCheck,
  document_rejected: AlertCircle,
  task_assigned: ListTodo,
  task_due: AlarmClock,
  process_milestone: Bell,
  note_alarm: AlarmClock,
  default: Bell,
};

export function NotificationItem({
  notification,
  compact = false,
  onClick,
}: NotificationItemProps) {
  const locale = useLocale();
  const t = useTranslations("Notifications");
  const router = useRouter();
  const markAsRead = useMutation(api.notifications.markAsRead);

  const dateLocale = locale === "pt" ? ptBR : enUS;
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: dateLocale,
  });

  const Icon =
    notificationIcons[notification.type as keyof typeof notificationIcons] ||
    notificationIcons.default;
  const titleKey = getNotificationTitleKey(notification.type);
  const displayTitle =
    titleKey && t.has(titleKey) ? t(titleKey) : notification.title;
  const messageDescriptor = getNotificationMessageDescriptor(notification);
  const displayMessage = messageDescriptor
    ? t(messageDescriptor.key, messageDescriptor.values)
    : notification.message;

  const handleClick = async () => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await markAsRead({ notificationId: notification._id });
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    // Navigate to entity if available
    const target = getNotificationTarget(notification);
    if (target) router.push(target);

    // Call custom onClick if provided
    onClick?.();
  };

  return (
    <button
      type="button"
      className={cn(
        "flex w-full gap-3 rounded-lg p-3 text-left transition-colors",
        !notification.isRead && "bg-muted/50",
        "hover:bg-muted",
        compact && "p-2",
      )}
      onClick={handleClick}
    >
      <div className={cn("flex-shrink-0 mt-1", compact && "mt-0")}>
        <div
          className={cn(
            "rounded-full p-2",
            notification.isRead
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className={cn("h-4 w-4", compact && "h-3 w-3")} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "font-medium text-sm",
              !notification.isRead && "font-semibold",
            )}
          >
            {displayTitle}
          </p>
          {!notification.isRead && (
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />
          )}
        </div>

        {!compact && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {displayMessage}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </button>
  );
}
