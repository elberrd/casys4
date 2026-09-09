"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ReportPageSheet } from "@/components/report-templates/report-page-sheet";
import {
  REPORT_CONTENT_HEIGHT_MM,
  REPORT_PAGE_GAP_MM,
  REPORT_PAGE_MARGIN_X_MM,
  REPORT_PAGE_MARGIN_Y_MM,
  REPORT_PAGE_WIDTH_MM,
  countReportContentPages,
  reportDocumentCss,
} from "@/lib/report-templates/page-layout";

interface ReportPaperPreviewProps {
  html: string;
  className?: string;
  ariaLabel: string;
  pageBreakLabel?: (page: number) => string;
}

const PREVIEW_CONTENT_WIDTH_MM =
  REPORT_PAGE_WIDTH_MM - REPORT_PAGE_MARGIN_X_MM * 2;

export function ReportPaperPreview({
  html,
  className,
  ariaLabel,
  pageBreakLabel,
}: ReportPaperPreviewProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);

  useLayoutEffect(() => {
    const measure = measureRef.current;
    if (!measure) return;

    const updatePages = () => {
      const contentPagePx =
        measure.offsetWidth *
        (REPORT_CONTENT_HEIGHT_MM / PREVIEW_CONTENT_WIDTH_MM);
      setPageCount(
        countReportContentPages(measure.scrollHeight, contentPagePx),
      );
    };

    updatePages();
    const observer = new ResizeObserver(updatePages);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [html]);

  return (
    <div
      className={cn(
        "overflow-auto rounded-lg border bg-[#cfcfcf] p-6 dark:bg-neutral-800",
        className,
      )}
    >
      <style>{reportDocumentCss(".report-paper-preview")}</style>
      <div
        ref={measureRef}
        aria-hidden
        className="report-paper-preview pointer-events-none absolute top-0"
        style={{
          left: -10000,
          width: `${PREVIEW_CONTENT_WIDTH_MM}mm`,
          color: "#111827",
        }}
        dangerouslySetInnerHTML={{ __html: html || "" }}
      />
      <div
        aria-label={ariaLabel}
        className="flex flex-col items-center"
        style={{ gap: `${REPORT_PAGE_GAP_MM}mm` }}
      >
        {Array.from({ length: pageCount }).map((_, index) => (
          <ReportPageSheet
            key={index}
            clip
            showMarginGuides={false}
            pageLabel={pageBreakLabel?.(index + 1)}
          >
            <div
              className="h-full overflow-hidden"
              style={{
                padding: `${REPORT_PAGE_MARGIN_Y_MM}mm ${REPORT_PAGE_MARGIN_X_MM}mm`,
                boxSizing: "border-box",
              }}
            >
              <div
                className="report-paper-preview"
                style={{
                  transform: `translateY(${-index * REPORT_CONTENT_HEIGHT_MM}mm)`,
                  color: "#111827",
                }}
                dangerouslySetInnerHTML={{ __html: html || "" }}
              />
            </div>
          </ReportPageSheet>
        ))}
      </div>
    </div>
  );
}
