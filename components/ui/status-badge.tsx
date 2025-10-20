"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/utils/status-validation";

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  status: string;
  type: "main_process" | "individual_process";
  className?: string;
}

/**
 * StatusBadge component displays process statuses with appropriate color coding
 * Supports both main process and individual process statuses
 * Uses i18n for status labels
 */
export function StatusBadge({
  status,
  type,
  className,
  ...props
}: StatusBadgeProps) {
  const t = useTranslations("ProcessStatuses");

  // Get color classes from status validation utility
  const colorClasses = getStatusColor(status);

  // Get translation key based on process type
  const translationKey = `${type}.${status}` as any;

  // Get translated label, fallback to formatted status if translation missing
  const label = t(translationKey);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        colorClasses,
        className
      )}
      role="status"
      aria-label={`Status: ${label}`}
      {...props}
    >
      {label}
    </div>
  );
}
