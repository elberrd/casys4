export const REPORT_PAGE_WIDTH_MM = 210;
export const REPORT_PAGE_HEIGHT_MM = 297;
export const REPORT_PAGE_MARGIN_X_MM = 18;
export const REPORT_PAGE_MARGIN_Y_MM = 20;

export const REPORT_PAGE_WIDTH_PX = Math.round(
  (REPORT_PAGE_WIDTH_MM * 96) / 25.4,
);
export const REPORT_PAGE_HEIGHT_PX = Math.round(
  (REPORT_PAGE_HEIGHT_MM * 96) / 25.4,
);

export const REPORT_ZOOM_LEVELS = [50, 75, 90, 100, 125, 150] as const;
export type ReportZoomLevel = (typeof REPORT_ZOOM_LEVELS)[number];

export const REPORT_DOCUMENT_CSS = `
  color: #111827;
  font-family: "Times New Roman", Times, serif;
  font-size: 16px;
  line-height: 1.6;
`;

export function reportDocumentCss(selector: string): string {
  return `
    ${selector} { ${REPORT_DOCUMENT_CSS} }
    ${selector} table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    ${selector} th, ${selector} td {
      border: 1px solid #d1d5db;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    ${selector} th { background: #f3f4f6; font-weight: 600; }
    ${selector} p { margin: 0 0 0.75em; }
    ${selector} h1, ${selector} h2, ${selector} h3 {
      margin: 0 0 0.6em;
      line-height: 1.25;
      color: #111827;
    }
    ${selector} ul, ${selector} ol { margin: 0 0 0.75em; padding-left: 1.4em; }
    ${selector} blockquote {
      margin: 0 0 0.75em;
      padding-left: 12px;
      border-left: 3px solid #d1d5db;
      color: #4b5563;
    }
    ${selector} hr { border: none; border-top: 1px solid #d1d5db; margin: 16px 0; }
  `;
}

export function nextReportZoomLevel(
  current: number,
  direction: 1 | -1,
): ReportZoomLevel {
  const index = REPORT_ZOOM_LEVELS.findIndex((level) => level === current);
  const from = index === -1 ? REPORT_ZOOM_LEVELS.indexOf(100) : index;
  const next = from + direction;
  const clamped = Math.max(0, Math.min(REPORT_ZOOM_LEVELS.length - 1, next));
  return REPORT_ZOOM_LEVELS[clamped] ?? 100;
}

export function countReportPages(heightPx: number, widthPx: number): number {
  if (widthPx <= 0 || heightPx <= 0) return 1;
  const pageHeightPx = widthPx * (REPORT_PAGE_HEIGHT_MM / REPORT_PAGE_WIDTH_MM);
  if (heightPx <= pageHeightPx + 1) return 1;
  return Math.ceil(heightPx / pageHeightPx);
}
