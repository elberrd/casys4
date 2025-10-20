"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  FileText,
  ArrowRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface ProcessTimelineProps {
  individualProcessId: Id<"individualProcesses">;
}

export function ProcessTimeline({ individualProcessId }: ProcessTimelineProps) {
  const t = useTranslations("ProcessTimeline");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  const historyRecords = useQuery(api.processHistory.getByIndividualProcess, {
    individualProcessId,
  });

  const dateLocale = locale === "pt" ? ptBR : enUS;

  const getStatusChangeIcon = (previousStatus?: string, newStatus?: string) => {
    if (!previousStatus && newStatus) {
      // Initial status
      return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }

    // Use status to determine icon
    if (newStatus?.includes("approved")) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (newStatus?.includes("rejected") || newStatus?.includes("cancelled")) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    if (newStatus?.includes("completed")) {
      return <CheckCircle className="h-5 w-5 text-emerald-600" />;
    }
    if (newStatus?.includes("submitted") || newStatus?.includes("review")) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }

    return <Clock className="h-5 w-5 text-muted-foreground" />;
  };

  if (historyRecords === undefined) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {tCommon("loading")}
      </div>
    );
  }

  if (historyRecords.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{t("noHistory")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">{t("title")}</h3>
      </div>

      <div className="space-y-0">
        {historyRecords.map((record, index) => {
          const isFirst = index === 0;
          const isLast = index === historyRecords.length - 1;

          return (
            <div key={record._id} className="relative">
              {/* Timeline connector line */}
              {!isLast && (
                <div className="absolute left-[22px] top-12 bottom-0 w-0.5 bg-border" />
              )}

              <div className="flex gap-4 pb-6">
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      "flex items-center justify-center w-11 h-11 rounded-full border-2 bg-background",
                      isLast && "border-primary bg-primary/5"
                    )}
                  >
                    {getStatusChangeIcon(record.previousStatus, record.newStatus)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3 pt-1">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-1">
                      {/* Status change */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {record.previousStatus ? (
                          <>
                            <StatusBadge
                              status={record.previousStatus}
                              type="individual_process"
                            />
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <StatusBadge
                              status={record.newStatus}
                              type="individual_process"
                            />
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {t("initialStatus")}:
                            </span>
                            <StatusBadge
                              status={record.newStatus}
                              type="individual_process"
                            />
                          </div>
                        )}
                        {isLast && (
                          <Badge variant="outline" className="text-xs">
                            {t("current")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(record.changedAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </div>
                  </div>

                  {/* Details card */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    {/* Changed by */}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {t("changedBy")}:
                      </span>
                      <span className="font-medium">
                        {record.changedByProfile?.fullName ||
                          record.changedByUser?.email ||
                          t("unknown")}
                      </span>
                    </div>

                    {/* Date and time */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {t("changedAt")}:
                      </span>
                      <span className="font-medium">
                        {format(new Date(record.changedAt), "PPP p", {
                          locale: dateLocale,
                        })}
                      </span>
                    </div>

                    {/* Notes */}
                    {record.notes && (
                      <div className="pt-2 border-t">
                        <div className="flex items-start gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-muted-foreground font-medium mb-1">
                              {t("notes")}:
                            </p>
                            <p className="text-foreground whitespace-pre-wrap">
                              {record.notes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
