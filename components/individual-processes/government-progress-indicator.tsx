"use client";

import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import { calculateGovernmentStatus } from "@/lib/utils/government-status";

interface GovernmentProgressIndicatorProps {
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
  showPercentage?: boolean;
}

export function GovernmentProgressIndicator({
  individualProcess,
  showPercentage = true,
}: GovernmentProgressIndicatorProps) {
  const t = useTranslations("GovernmentStatus");

  const statusResult = calculateGovernmentStatus(individualProcess);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("submissionProgress")}</span>
        {showPercentage && (
          <span className="font-medium">{statusResult.progress}%</span>
        )}
      </div>
      <Progress value={statusResult.progress} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {t(statusResult.label)}
      </p>
    </div>
  );
}
