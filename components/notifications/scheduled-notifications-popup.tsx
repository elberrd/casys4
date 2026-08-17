"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlarmClock,
  ArrowUpRight,
  BellRing,
  CheckCheck,
  Clock3,
  ListTodo,
  StickyNote,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "@/i18n/routing";
import {
  getNotificationTarget,
  getSaoPauloDate,
} from "@/lib/notification-targets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getNotificationMessageDescriptor,
  getNotificationTitleKey,
} from "@/lib/notification-display";

const DAY_MS = 24 * 60 * 60 * 1000;

function getNextSaoPauloMidnight(today: string): number {
  const noonUtc = Date.parse(`${today}T12:00:00.000Z`);
  const nextDate = getSaoPauloDate(noonUtc + DAY_MS);
  return Date.parse(`${nextDate}T03:00:00.000Z`);
}

export function ScheduledNotificationsPopup() {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [pendingId, setPendingId] = useState<Id<"notifications"> | null>(null);
  const [isDismissingToday, setIsDismissingToday] = useState(false);
  const scheduledDate = getSaoPauloDate(now);
  const notifications = useQuery(api.notifications.getScheduledNotifications, {
    scheduledDate,
  });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const snooze = useMutation(api.notifications.snooze);
  const dismissToday = useMutation(api.notifications.dismissToday);

  const dueNotifications = useMemo(
    () =>
      (notifications ?? []).filter(
        (notification) =>
          notification.sourceAvailable &&
          (!notification.snoozedUntil || notification.snoozedUntil <= now),
      ),
    [notifications, now],
  );

  useEffect(() => {
    const futureSnoozes = (notifications ?? [])
      .map((notification) => notification.snoozedUntil)
      .filter((timestamp): timestamp is number =>
        Boolean(timestamp && timestamp > now),
      );
    const nextSnooze =
      futureSnoozes.length > 0 ? Math.min(...futureSnoozes) : Infinity;
    const nextWakeAt = Math.min(
      nextSnooze,
      getNextSaoPauloMidnight(scheduledDate),
    );
    const timeout = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(1_000, Math.min(nextWakeAt - Date.now(), 2_147_000_000)),
    );

    const refreshClock = () => setNow(Date.now());
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshClock();
    };
    window.addEventListener("focus", refreshClock);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("focus", refreshClock);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [notifications, now, scheduledDate]);

  const handleOpen = async (
    notification: (typeof dueNotifications)[number],
  ) => {
    const target = getNotificationTarget(notification);
    if (!target) return;

    setPendingId(notification._id);
    try {
      await markAsRead({ notificationId: notification._id });
      router.push(target);
    } catch {
      toast.error(t("actionError"));
    } finally {
      setPendingId(null);
    }
  };

  const handleSnooze = async (
    notificationId: Id<"notifications">,
    hours: 2 | 5,
  ) => {
    setPendingId(notificationId);
    try {
      await snooze({ notificationId, hours });
      setNow(Date.now());
      toast.success(t("snoozedSuccess", { hours }));
    } catch {
      toast.error(t("actionError"));
    } finally {
      setPendingId(null);
    }
  };

  const handleDismissToday = async () => {
    setIsDismissingToday(true);
    try {
      await dismissToday({ scheduledDate });
      toast.success(t("dismissedTodaySuccess"));
    } catch {
      toast.error(t("actionError"));
    } finally {
      setIsDismissingToday(false);
    }
  };

  return (
    <Dialog open={dueNotifications.length > 0}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="mb-0 border-b bg-muted/35 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3 pr-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BellRing className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl leading-tight">
                  {t("scheduledPopupTitle")}
                </DialogTitle>
                <Badge variant="secondary" className="tabular-nums">
                  {dueNotifications.length}
                </Badge>
              </div>
              <DialogDescription className="mt-1 max-w-prose">
                {t("scheduledPopupDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="divide-y">
            {dueNotifications.map((notification) => {
              const isNote = notification.type === "note_alarm";
              const Icon = isNote
                ? StickyNote
                : notification.type === "task_due"
                  ? ListTodo
                  : AlarmClock;
              const isPending = pendingId === notification._id;
              const target = getNotificationTarget(notification);
              const titleKey = getNotificationTitleKey(notification.type);
              const displayTitle =
                titleKey && t.has(titleKey) ? t(titleKey) : notification.title;
              const messageDescriptor =
                getNotificationMessageDescriptor(notification);
              const displayMessage = messageDescriptor
                ? t(messageDescriptor.key, messageDescriptor.values)
                : notification.message;

              return (
                <section
                  key={notification._id}
                  className="flex flex-col gap-4 px-5 py-4 sm:px-6"
                  aria-label={displayTitle}
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="font-semibold leading-snug">
                          {displayTitle}
                        </h3>
                        <Badge variant="outline" className="font-normal">
                          {t.has(`types.${notification.type}`)
                            ? t(`types.${notification.type}`)
                            : notification.type.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {displayMessage}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      {t("scheduledForToday")}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleSnooze(notification._id, 2)}
                      >
                        {t("snoozeHours", { hours: 2 })}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleSnooze(notification._id, 5)}
                      >
                        {t("snoozeHours", { hours: 5 })}
                      </Button>
                      <Button
                        size="sm"
                        className="col-span-2 gap-2"
                        disabled={isPending || !target}
                        onClick={() => handleOpen(notification)}
                      >
                        {t("openSource")}
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-3 border-t bg-muted/20 px-5 pb-5 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-sm">
            {t("dismissTodayHint")}
          </p>
          <Button
            variant="outline"
            className="gap-2"
            disabled={isDismissingToday || pendingId !== null}
            onClick={handleDismissToday}
          >
            <CheckCheck className="size-4" />
            {t("dismissToday")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
