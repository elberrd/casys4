"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ReportPageSheet } from "@/components/report-templates/report-page-sheet";
import {
  REPORT_CONTENT_HEIGHT_MM,
  REPORT_PAGE_GAP_MM,
  REPORT_PAGE_HEIGHT_MM,
  REPORT_PAGE_MARGIN_X_MM,
  REPORT_PAGE_MARGIN_Y_MM,
  REPORT_PAGE_WIDTH_MM,
  REPORT_ZOOM_LEVELS,
  REPORT_ZOOM_MAX,
  REPORT_ZOOM_MIN,
  countReportContentPages,
  fitReportZoom,
  nextReportZoomLevel,
  reportPageStackHeightMm,
} from "@/lib/report-templates/page-layout";

interface ReportPageCanvasProps {
  children: ReactNode;
  zoom: number;
  zoomMode: "fit" | number;
  onZoomChange: (zoom: number) => void;
  onZoomModeChange: (mode: "fit" | number) => void;
  zoomLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  fitWidthLabel: string;
  pageSizeLabel: string;
  pageCountLabel: (count: number) => string;
  pageBreakLabel: (page: number) => string;
  className?: string;
}

export function ReportPageCanvas({
  children,
  zoom,
  zoomMode,
  onZoomChange,
  onZoomModeChange,
  zoomLabel,
  zoomInLabel,
  zoomOutLabel,
  fitWidthLabel,
  pageSizeLabel,
  pageCountLabel,
  pageBreakLabel,
  className,
}: ReportPageCanvasProps) {
  const deskRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const scale = zoom / 100;
  const stackHeightMm = reportPageStackHeightMm(pageCount);

  useLayoutEffect(() => {
    const desk = deskRef.current;
    if (!desk) return;

    const updateFit = () => {
      onZoomChange(fitReportZoom(desk.clientWidth));
    };

    if (zoomMode === "fit") {
      updateFit();
    }
    const observer = new ResizeObserver(() => {
      if (zoomMode === "fit") {
        updateFit();
      }
    });
    observer.observe(desk);
    return () => observer.disconnect();
  }, [onZoomChange, zoomMode]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const observed = new Set<Element>();
    const observer = new ResizeObserver(() => {
      const prose = content.querySelector<HTMLElement>(".ProseMirror");
      if (!prose) {
        setPageCount(1);
        return;
      }
      if (!observed.has(prose)) {
        observer.observe(prose);
        observed.add(prose);
      }
      const pageWidth = content.offsetWidth;
      const pageHeight =
        pageWidth * (REPORT_PAGE_HEIGHT_MM / REPORT_PAGE_WIDTH_MM);
      const contentPageHeight =
        pageHeight * (REPORT_CONTENT_HEIGHT_MM / REPORT_PAGE_HEIGHT_MM);
      let contentHeight = prose.scrollHeight;
      prose.querySelectorAll<HTMLElement>(".report-page-gap").forEach((gap) => {
        contentHeight -= gap.offsetHeight;
      });
      setPageCount(countReportContentPages(contentHeight, contentPageHeight));
    });

    observer.observe(content);
    observed.add(content);
    const mutationObserver = new MutationObserver(() => {
      const prose = content.querySelector(".ProseMirror");
      if (prose && !observed.has(prose)) {
        observer.observe(prose);
        observed.add(prose);
      }
    });
    mutationObserver.observe(content, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const desk = deskRef.current;
    if (!desk) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const next = nextReportZoomLevel(zoom, event.deltaY < 0 ? 1 : -1);
      onZoomModeChange(next);
      onZoomChange(next);
    };

    desk.addEventListener("wheel", handleWheel, { passive: false });
    return () => desk.removeEventListener("wheel", handleWheel);
  }, [onZoomChange, onZoomModeChange, zoom]);

  const selectValue = zoomMode === "fit" ? "fit" : String(zoomMode);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        ref={deskRef}
        className="min-h-0 flex-1 overflow-auto bg-[#cfcfcf] dark:bg-neutral-800"
      >
        <div className="flex justify-center py-8" style={{ zoom: scale }}>
          <div
            data-report-page-stack
            className="relative"
            style={{
              width: `${REPORT_PAGE_WIDTH_MM}mm`,
              minHeight: `${stackHeightMm}mm`,
            }}
          >
            {Array.from({ length: pageCount }).map((_, index) => (
              <div
                key={index}
                className="absolute top-0 left-0"
                style={{
                  transform: `translateY(${index * (REPORT_PAGE_HEIGHT_MM + REPORT_PAGE_GAP_MM)}mm)`,
                }}
              >
                <ReportPageSheet
                  isProbe={index === 0}
                  pageLabel={pageBreakLabel(index + 1)}
                />
              </div>
            ))}
            <div
              ref={contentRef}
              className="relative z-10"
              style={{
                minHeight: `${REPORT_PAGE_HEIGHT_MM}mm`,
                padding: `${REPORT_PAGE_MARGIN_Y_MM}mm ${REPORT_PAGE_MARGIN_X_MM}mm`,
                boxSizing: "border-box",
              }}
            >
              {children}
            </div>
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
            onClick={() => {
              const next = nextReportZoomLevel(zoom, -1);
              onZoomModeChange(next);
              onZoomChange(next);
            }}
            disabled={zoom <= REPORT_ZOOM_MIN}
            title={zoomOutLabel}
            aria-label={zoomOutLabel}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">
            {zoom}%
          </span>
          <select
            className="h-7 rounded-md border bg-background px-2 text-xs"
            value={selectValue}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "fit") {
                onZoomModeChange("fit");
                const desk = deskRef.current;
                if (desk) {
                  onZoomChange(fitReportZoom(desk.clientWidth));
                }
                return;
              }
              const next = Number(value);
              onZoomModeChange(next);
              onZoomChange(next);
            }}
            aria-label={zoomLabel}
          >
            <option value="fit">{fitWidthLabel}</option>
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
            onClick={() => {
              const next = nextReportZoomLevel(zoom, 1);
              onZoomModeChange(next);
              onZoomChange(next);
            }}
            disabled={zoom >= REPORT_ZOOM_MAX}
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
