"use client";

import { cn } from "@/lib/utils";
import {
  REPORT_PAGE_HEIGHT_MM,
  REPORT_PAGE_MARGIN_X_MM,
  REPORT_PAGE_MARGIN_Y_MM,
  REPORT_PAGE_WIDTH_MM,
  reportDocumentCss,
} from "@/lib/report-templates/page-layout";

interface ReportPaperPreviewProps {
  html: string;
  className?: string;
  ariaLabel: string;
}

export function ReportPaperPreview({
  html,
  className,
  ariaLabel,
}: ReportPaperPreviewProps) {
  return (
    <div
      className={cn(
        "overflow-auto rounded-lg border bg-neutral-300/80 p-4 dark:bg-neutral-800",
        className,
      )}
    >
      <article
        aria-label={ariaLabel}
        className="report-paper-preview mx-auto bg-white text-neutral-900 shadow-[0_8px_30px_rgba(15,23,42,0.18)]"
        style={{
          width: `${REPORT_PAGE_WIDTH_MM}mm`,
          minHeight: `${REPORT_PAGE_HEIGHT_MM}mm`,
          padding: `${REPORT_PAGE_MARGIN_Y_MM}mm ${REPORT_PAGE_MARGIN_X_MM}mm`,
          boxSizing: "border-box",
          color: "#111827",
        }}
      >
        <div
          dangerouslySetInnerHTML={{
            __html: `<style>${reportDocumentCss(".report-paper-preview")}</style>${html || ""}`,
          }}
        />
      </article>
    </div>
  );
}
