"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/utils/status-validation";

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  status?: string;
  type: "main_process" | "individual_process";
  color?: string; // Optional: Case status color (named, e.g. "blue", or hex, e.g. "#574444")
  category?: string; // Optional: Case status category
  className?: string;
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** True when the value is a hex color like "#574444" or "#abc". */
function isHexColor(value?: string): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value.trim());
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/**
 * Builds inline badge styles for an admin-configured hex color. Mirrors the
 * named-color look: full-strength border (~500), faint tinted background (~50),
 * and a darker text shade (~700) for readable contrast. Inline styles are used
 * (instead of Tailwind arbitrary-value classes) because the JIT does not reliably
 * generate `var()`-based color utilities here; the app is light-mode only.
 */
function getHexBadgeStyle(hex: string): React.CSSProperties {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const darken = (c: number) => clamp(c * 0.6); // toward a ~700 shade for the text
  return {
    borderColor: hex,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    color: `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`,
  };
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
  style: styleProp,
  ...props
}: StatusBadgeProps) {
  const t = useTranslations("ProcessStatuses");

  // Handle undefined status
  if (!status) {
    return null;
  }

  // Get color classes - use provided color/category if available, otherwise fallback to utility
  let colorClasses = "";
  let inlineStyle: React.CSSProperties | undefined;

  if (isHexColor(color)) {
    // Admin-configured hex color (from the case status "Cor" picker). Apply it via
    // inline styles so the selected color is actually shown instead of falling back to blue.
    inlineStyle = getHexBadgeStyle(color);
  } else if (color && category) {
    // Legacy named colors mapped to Tailwind classes
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
    // Fallback to old status validation utility (default blue/gray when no color set)
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
      style={{ ...inlineStyle, ...styleProp }}
      role="status"
      aria-label={`Status: ${label}`}
      {...props}
    >
      {label}
    </div>
  );
}
