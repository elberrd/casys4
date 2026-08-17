"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import {
  EntityViewModal,
  ViewSection,
} from "@/components/ui/entity-view-modal";
import { Button } from "@/components/ui/button";
import { createField, createBadgeField } from "@/lib/entity-view-helpers";
import {
  ArrowUpRight,
  Bell,
  Link as LinkIcon,
  CheckCircle,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import {
  getNotificationDestinationKind,
  getNotificationTarget,
  type NotificationDestinationKind,
} from "@/lib/notification-targets";
import {
  getNotificationMessageDescriptor,
  getNotificationTitleKey,
} from "@/lib/notification-display";

interface NotificationViewModalProps {
  notificationId: Id<"notifications">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function NotificationViewModal({
  notificationId,
  open,
  onOpenChange,
  onEdit,
}: NotificationViewModalProps) {
  const t = useTranslations("Notifications");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const notification = useQuery(api.notifications.get, { id: notificationId });

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
    );
  }

  const titleKey = getNotificationTitleKey(notification.type);
  const displayTitle =
    titleKey && t.has(titleKey) ? t(titleKey) : notification.title;
  const messageDescriptor = getNotificationMessageDescriptor(notification);
  const displayMessage = messageDescriptor
    ? t(messageDescriptor.key, messageDescriptor.values)
    : notification.message;
  const target = getNotificationTarget(notification);
  const destinationKind = getNotificationDestinationKind(notification);

  const getDestinationLabel = (kind: NotificationDestinationKind) => {
    switch (kind) {
      case "documentation":
        return t("destinations.documentation");
      case "note":
        return t("destinations.note");
      case "task":
        return t("destinations.task");
      case "process":
        return t("destinations.process");
      case "processRequest":
        return t("destinations.processRequest");
      case "document":
        return t("destinations.document");
      case "person":
        return t("destinations.person");
      case "company":
        return t("destinations.company");
    }
  };

  const getActionLabel = (kind: NotificationDestinationKind) => {
    switch (kind) {
      case "documentation":
        return t("openDocumentation");
      case "note":
        return t("openNote");
      case "task":
        return t("openTask");
      case "process":
        return t("openProcess");
      case "processRequest":
        return t("openProcessRequest");
      case "document":
        return t("openDocument");
      case "person":
        return t("openPerson");
      case "company":
        return t("openCompany");
    }
  };

  const sections: ViewSection[] = [
    {
      title: t("notificationInformation"),
      icon: <Bell className="h-5 w-5" />,
      fields: [
        createField(t("title"), displayTitle),
        createBadgeField(
          t("type"),
          titleKey && t.has(titleKey) ? t(titleKey) : notification.type,
          "outline",
        ),
        createField(t("message"), displayMessage, undefined, {
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
          notification.isRead ? "default" : "secondary",
        ),
        createField(t("readAt"), notification.readAt, "datetime"),
        createField(t("scheduledDate"), notification.scheduledDate),
        createField(t("snoozedUntil"), notification.snoozedUntil, "datetime"),
        createField(
          t("dismissedAt"),
          notification.popupDismissedAt,
          "datetime",
        ),
        createField(t("createdAt"), notification.createdAt, "datetime"),
      ],
    },
  ];

  if (target && destinationKind) {
    sections.push({
      title: t("destination"),
      icon: <LinkIcon className="h-5 w-5" />,
      fields: [
        createField(
          t("destinationPage"),
          getDestinationLabel(destinationKind),
          undefined,
          { fullWidth: true },
        ),
      ],
    });
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
      footer={
        target && destinationKind ? (
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => {
              router.push(target);
              onOpenChange(false);
            }}
          >
            {getActionLabel(destinationKind)}
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        ) : undefined
      }
    />
  );
}
