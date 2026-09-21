export const REPORT_PAGE_WIDTH_MM = 210;
export const REPORT_PAGE_HEIGHT_MM = 297;
export const REPORT_PAGE_MARGIN_X_MM = 18;
export const REPORT_PAGE_MARGIN_Y_MM = 20;
export const REPORT_PAGE_GAP_MM = 12;
export const REPORT_CONTENT_HEIGHT_MM =
  REPORT_PAGE_HEIGHT_MM - REPORT_PAGE_MARGIN_Y_MM * 2;
export const REPORT_PAGE_SPACER_MM =
  REPORT_PAGE_MARGIN_Y_MM * 2 + REPORT_PAGE_GAP_MM;

export const REPORT_PAGE_WIDTH_PX = Math.round(
  (REPORT_PAGE_WIDTH_MM * 96) / 25.4,
);
export const REPORT_PAGE_HEIGHT_PX = Math.round(
  (REPORT_PAGE_HEIGHT_MM * 96) / 25.4,
);

export const REPORT_ZOOM_LEVELS = [50, 75, 90, 100, 125, 150] as const;
export type ReportZoomLevel = (typeof REPORT_ZOOM_LEVELS)[number];
export const REPORT_ZOOM_MIN: ReportZoomLevel = 50;
export const REPORT_ZOOM_MAX: ReportZoomLevel = 150;

export const REPORT_DOCUMENT_CSS = `
  color: #111827;
  font-family: "Times New Roman", Times, serif;
  font-size: 16px;
  line-height: 1.6;
  white-space: pre-wrap !important;
  tab-size: 4;
`;

const NBSP = "\u00a0";

/** Empty TipTap/ProseMirror blocks: <p></p>, <p><br></p>, trailing-break variants. */
const EMPTY_REPORT_BLOCK_RE =
  /<(p|h1|h2|h3)(\s[^>]*)?>(?:\s|&nbsp;|&#160;|<br\b[^>]*>)*<\/\1>/gi;

export function preserveReportTextWhitespace(text: string): string {
  return text
    .replace(/\t/g, NBSP.repeat(4))
    .replace(/ {2,}/g, (chunk) => NBSP.repeat(chunk.length))
    .replace(/^ /g, NBSP)
    .replace(/ $/g, NBSP);
}

export function preserveReportEmptyBlocks(html: string): string {
  if (!html) return html;
  return html.replace(
    EMPTY_REPORT_BLOCK_RE,
    (_match, tag: string, attrs = "") => `<${tag}${attrs}>${NBSP}</${tag}>`,
  );
}

/** Keep typed spaces/tabs/blank paragraphs that browsers would otherwise collapse. */
export function preserveReportHtmlWhitespace(html: string): string {
  if (!html) return html;
  const withSpaces = html.replace(/>([^<]*)</g, (match, text: string) => {
    if (!text.includes(" ") && !text.includes("\t")) {
      return match;
    }
    return `>${preserveReportTextWhitespace(text)}<`;
  });
  return preserveReportEmptyBlocks(withSpaces);
}

export function reportDocumentCss(selector: string): string {
  return `
    ${selector} { ${REPORT_DOCUMENT_CSS} }
    ${selector}, ${selector} p, ${selector} h1, ${selector} h2, ${selector} h3,
    ${selector} li, ${selector} td, ${selector} th, ${selector} div, ${selector} span {
      white-space: pre-wrap !important;
      tab-size: 4;
    }
    ${selector} table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    ${selector} th, ${selector} td {
      border: 1px solid #d1d5db;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    ${selector} th { background: #f3f4f6; font-weight: 600; }
    ${selector} p { margin: 0 0 0.75em; }
    ${selector} p:empty,
    ${selector} h1:empty,
    ${selector} h2:empty,
    ${selector} h3:empty {
      min-height: 1.6em;
    }
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
  if (direction === 1) {
    const next = REPORT_ZOOM_LEVELS.find((level) => level > current + 0.5);
    return next ?? REPORT_ZOOM_MAX;
  }
  const previous = [...REPORT_ZOOM_LEVELS]
    .reverse()
    .find((level) => level < current - 0.5);
  return previous ?? REPORT_ZOOM_MIN;
}

export function fitReportZoom(
  containerWidthPx: number,
  paddingPx = 64,
): number {
  if (containerWidthPx <= 0) return 100;
  const available = Math.max(1, containerWidthPx - paddingPx);
  const raw = (available / REPORT_PAGE_WIDTH_PX) * 100;
  return Math.round(Math.min(REPORT_ZOOM_MAX, Math.max(REPORT_ZOOM_MIN, raw)));
}

export function reportPageStackHeightMm(pageCount: number): number {
  const pages = Math.max(1, pageCount);
  return pages * REPORT_PAGE_HEIGHT_MM + (pages - 1) * REPORT_PAGE_GAP_MM;
}

export function countReportPages(heightPx: number, widthPx: number): number {
  if (widthPx <= 0 || heightPx <= 0) return 1;
  const pageHeightPx = widthPx * (REPORT_PAGE_HEIGHT_MM / REPORT_PAGE_WIDTH_MM);
  if (heightPx <= pageHeightPx + 1) return 1;
  return Math.ceil(heightPx / pageHeightPx);
}

export function countReportContentPages(
  contentHeightPx: number,
  contentPageHeightPx: number,
): number {
  if (contentHeightPx <= 0 || contentPageHeightPx <= 0) return 1;
  const epsilon = Math.max(2, contentPageHeightPx * 0.008);
  if (contentHeightPx <= contentPageHeightPx + epsilon) return 1;
  return Math.ceil(contentHeightPx / contentPageHeightPx);
}
