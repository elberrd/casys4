"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  REPORT_PAGE_HEIGHT_MM,
  REPORT_PAGE_HEIGHT_PX,
  REPORT_PAGE_MARGIN_X_MM,
  REPORT_PAGE_MARGIN_Y_MM,
  REPORT_PAGE_WIDTH_MM,
  REPORT_PAGE_WIDTH_PX,
  REPORT_ZOOM_LEVELS,
  countReportPages,
  nextReportZoomLevel,
} from "@/lib/report-templates/page-layout";

interface ReportPageCanvasProps {
  children: ReactNode;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  zoomLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  pageSizeLabel: string;
  pageCountLabel: (count: number) => string;
  pageBreakLabel: (page: number) => string;
  className?: string;
}

export function ReportPageCanvas({
  children,
  zoom,
  onZoomChange,
  zoomLabel,
  zoomInLabel,
  zoomOutLabel,
  pageSizeLabel,
  pageCountLabel,
  pageBreakLabel,
  className,
}: ReportPageCanvasProps) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [paperSize, setPaperSize] = useState({
    width: REPORT_PAGE_WIDTH_PX,
    height: REPORT_PAGE_HEIGHT_PX,
  });
  const scale = zoom / 100;
  const pageCount = countReportPages(paperSize.height, paperSize.width);

  useLayoutEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;

    const updateSize = () => {
      setPaperSize({
        width: paper.offsetWidth,
        height: paper.offsetHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(paper);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-auto bg-neutral-300/80 dark:bg-neutral-800">
        <div className="flex justify-center py-8" style={{ zoom: scale }}>
          <div
            ref={paperRef}
            className="relative bg-white text-neutral-900 shadow-[0_8px_30px_rgba(15,23,42,0.18)]"
            style={{
              width: `${REPORT_PAGE_WIDTH_MM}mm`,
              minHeight: `${REPORT_PAGE_HEIGHT_MM}mm`,
              padding: `${REPORT_PAGE_MARGIN_Y_MM}mm ${REPORT_PAGE_MARGIN_X_MM}mm`,
              boxSizing: "border-box",
            }}
          >
            {Array.from({ length: Math.max(pageCount - 1, 0) }).map(
              (_, index) => (
                <div
                  key={index}
                  className="pointer-events-none absolute right-0 left-0 z-10"
                  style={{ top: `${(index + 1) * REPORT_PAGE_HEIGHT_MM}mm` }}
                >
                  <div className="border-t-2 border-dashed border-sky-400/90" />
                  <span className="absolute -top-2.5 right-3 rounded-sm bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-sky-800">
                    {pageBreakLabel(index + 2)}
                  </span>
                </div>
              ),
            )}
            {children}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-3 py-1.5">
        <p className="text-xs text-muted-foreground">
          {pageSizeLabel}
          <span className="mx-2 text-border">|</span>
          {pageCountLabel(pageCount)}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onZoomChange(nextReportZoomLevel(zoom, -1))}
            disabled={zoom <= REPORT_ZOOM_LEVELS[0]}
            title={zoomOutLabel}
            aria-label={zoomOutLabel}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <select
            className="h-7 rounded-md border bg-background px-2 text-xs"
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            aria-label={zoomLabel}
          >
            {REPORT_ZOOM_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}%
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onZoomChange(nextReportZoomLevel(zoom, 1))}
            disabled={zoom >= REPORT_ZOOM_LEVELS[REPORT_ZOOM_LEVELS.length - 1]}
            title={zoomInLabel}
            aria-label={zoomInLabel}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
