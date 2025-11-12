"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/utils/status-validation";

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  status?: string;
  type: "main_process" | "individual_process";
  color?: string; // Optional: Case status color
  category?: string; // Optional: Case status category
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
  color,
  category,
  className,
  ...props
}: StatusBadgeProps) {
  const t = useTranslations("ProcessStatuses");

  // Handle undefined status
  if (!status) {
    return null;
  }

  // Get color classes - use provided color/category if available, otherwise fallback to utility
  let colorClasses = "";

  if (color && category) {
    // Use case status color and category for styling
    const colorMap: Record<string, string> = {
      blue: "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      yellow: "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
      orange: "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
      green: "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
      emerald: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      red: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
      gray: "border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
    }

    colorClasses = colorMap[color] || colorMap.blue
  } else {
    // Fallback to old status validation utility
    colorClasses = getStatusColor(status);
  }

  // For case statuses, display the status name directly (already translated from backend)
  // For old statuses, use translation key
  // If color is provided, use status name directly (case status)
  // Otherwise attempt translation, but fallback to status name if translation is missing
  const label = color ? status : (t.has(`${type}.${status}` as any) ? t(`${type}.${status}` as any) : status);

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
