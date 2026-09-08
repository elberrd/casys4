"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  REPORT_PAGE_HEIGHT_MM,
  REPORT_PAGE_MARGIN_X_MM,
  REPORT_PAGE_MARGIN_Y_MM,
  REPORT_PAGE_WIDTH_MM,
} from "@/lib/report-templates/page-layout";

export function ReportPageMarginGuides() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 border border-dashed border-sky-300/80"
      style={{
        top: `${REPORT_PAGE_MARGIN_Y_MM}mm`,
        right: `${REPORT_PAGE_MARGIN_X_MM}mm`,
        bottom: `${REPORT_PAGE_MARGIN_Y_MM}mm`,
        left: `${REPORT_PAGE_MARGIN_X_MM}mm`,
      }}
    />
  );
}

interface ReportPageSheetProps {
  isProbe?: boolean;
  pageLabel?: string;
  className?: string;
  clip?: boolean;
  children?: ReactNode;
}

export function ReportPageSheet({
  isProbe = false,
  pageLabel,
  className,
  clip = false,
  children,
}: ReportPageSheetProps) {
  return (
    <div
      data-report-page-sheet={isProbe ? "true" : undefined}
      className={cn(
        "relative bg-white text-neutral-900 shadow-[0_4px_18px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.08)]",
        clip && "overflow-hidden",
        className,
      )}
      style={{
        width: `${REPORT_PAGE_WIDTH_MM}mm`,
        height: `${REPORT_PAGE_HEIGHT_MM}mm`,
        boxSizing: "border-box",
      }}
    >
      <ReportPageMarginGuides />
      {pageLabel ? (
        <span className="pointer-events-none absolute right-3 bottom-2.5 z-20 text-[10px] font-medium tracking-wide text-neutral-400">
          {pageLabel}
        </span>
      ) : null}
      {children}
    </div>
  );
}
