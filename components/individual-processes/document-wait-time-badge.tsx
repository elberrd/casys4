"use client";

import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatDocumentTimingDate,
  getDocumentWaitTime,
  type DocumentTimingLike,
} from "@/lib/document-wait-time";

export function DocumentWaitTimeBadge({
  document,
  className,
}: {
  document: DocumentTimingLike;
  className?: string;
}) {
  const t = useTranslations("DocumentTiming");
  const locale = useLocale();
  const timing = getDocumentWaitTime(document);
  const waitingStartDate = formatDocumentTimingDate(
    timing.waitingStartedAt,
    locale,
  );

  const title = timing.state === "received" && timing.receivedAt !== undefined
      ? t("receivedDetails", {
        waitingStartDate,
        receivedDate: formatDocumentTimingDate(timing.receivedAt, locale),
      })
    : timing.state === "superseded"
      ? t("supersededDetails", { waitingStartDate })
      : t("pendingDetails", { waitingStartDate });

  return (
    <Badge
      variant="outline"
      title={title}
      aria-label={title}
      className={cn(
        "shrink-0 rounded-full font-medium shadow-none",
        timing.state === "pending" &&
          "border-red-200 bg-red-50 text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300",
        timing.state === "received" &&
          "border-green-200 bg-green-50 text-green-700 hover:bg-green-50 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300",
        timing.state === "superseded" &&
          "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300",
        className,
      )}
    >
      {t(timing.state, { count: timing.days })}
    </Badge>
  );
}
