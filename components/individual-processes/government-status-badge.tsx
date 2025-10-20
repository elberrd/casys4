"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateGovernmentStatus, getNextGovernmentAction, type GovernmentSubmissionStatus } from "@/lib/utils/government-status";
import { Info } from "lucide-react";

interface GovernmentStatusBadgeProps {
  individualProcess: {
    mreOfficeNumber?: string;
    douNumber?: string;
    douSection?: string;
    douPage?: string;
    douDate?: string;
    protocolNumber?: string;
    rnmNumber?: string;
    rnmDeadline?: string;
    appointmentDateTime?: string;
  };
  showTooltip?: boolean;
}

const statusVariantMap: Record<
  GovernmentSubmissionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  not_started: "outline",
  preparing: "secondary",
  submitted: "default",
  under_review: "default",
  approved: "default",
};

export function GovernmentStatusBadge({
  individualProcess,
  showTooltip = true,
}: GovernmentStatusBadgeProps) {
  const t = useTranslations("GovernmentStatus");
  const tActions = useTranslations("GovernmentActions");

  const statusResult = calculateGovernmentStatus(individualProcess);
  const nextAction = getNextGovernmentAction(individualProcess);

  const variant = statusVariantMap[statusResult.status];

  const badgeStyles = {
    gray: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    yellow: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    blue: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    green: "bg-green-100 text-green-800 hover:bg-green-100",
  };

  const badge = (
    <Badge variant={variant} className={badgeStyles[statusResult.color]}>
      {t(statusResult.label)}
    </Badge>
  );

  if (!showTooltip || !nextAction) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 cursor-help">
            {badge}
            <Info className="h-3 w-3 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{t("statusDetails")}</p>
            <p className="text-sm text-muted-foreground">
              {t("progress")}: {statusResult.progress}%
            </p>
            {nextAction && (
              <p className="text-sm">
                {t("nextAction")}: {tActions(nextAction)}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
