import {
  REPORT_PAGE_HEIGHT_MM,
  REPORT_PAGE_HEIGHT_PX,
  REPORT_PAGE_MARGIN_X_MM,
  REPORT_PAGE_MARGIN_Y_MM,
  REPORT_PAGE_WIDTH_MM,
  REPORT_PAGE_WIDTH_PX,
  preserveReportHtmlWhitespace,
  reportDocumentCss,
} from "./page-layout";

const PREVIEW_TABLE_STYLES = `
  html, body { margin: 0; padding: 0; background: #ffffff; }
  #report-paper {
    width: ${REPORT_PAGE_WIDTH_MM}mm;
    min-height: ${REPORT_PAGE_HEIGHT_MM}mm;
    box-sizing: border-box;
    padding: ${REPORT_PAGE_MARGIN_Y_MM}mm ${REPORT_PAGE_MARGIN_X_MM}mm;
    background: #ffffff;
  }
  ${reportDocumentCss("#report-paper")}
`;

const UNSUPPORTED_COLOR_FUNCTION =
  /oklch\([^)]*\)|oklab\([^)]*\)|color-mix\([^)]*\)/gi;

function hasUnsupportedColorFunction(value: string): boolean {
  return /oklch\(|oklab\(|color-mix\(/i.test(value);
}

export function sanitizeReportHtmlForPdf(html: string): string {
  return html.replace(UNSUPPORTED_COLOR_FUNCTION, "#111827");
}

export function buildIsolatedReportHtml(bodyHtml: string): string {
  const content = sanitizeReportHtmlForPdf(
    preserveReportHtmlWhitespace(bodyHtml || ""),
  );
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${PREVIEW_TABLE_STYLES}</style>
  </head>
  <body>
    <div id="report-paper">${content}</div>
  </body>
</html>`;
}

function stripUnsupportedColorsFromClone(clonedDoc: Document) {
  clonedDoc
    .querySelectorAll("style, link[rel='stylesheet']")
    .forEach((node) => node.remove());
  const style = clonedDoc.createElement("style");
  style.textContent = PREVIEW_TABLE_STYLES;
  clonedDoc.head.appendChild(style);
  clonedDoc.documentElement.style.backgroundColor = "#ffffff";
  clonedDoc.documentElement.style.color = "#111827";
  if (clonedDoc.body) {
    clonedDoc.body.style.backgroundColor = "#ffffff";
    clonedDoc.body.style.color = "#111827";
  }
  clonedDoc.querySelectorAll<HTMLElement>("*").forEach((element) => {
    const inline = element.getAttribute("style");
    if (inline && hasUnsupportedColorFunction(inline)) {
      element.setAttribute("style", sanitizeReportHtmlForPdf(inline));
    }
  });
}

function loadIframeDocument(html: string): Promise<{
  iframe: HTMLIFrameElement;
  paper: HTMLElement;
}> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;left:-12000px;top:0;width:" +
      REPORT_PAGE_WIDTH_PX +
      "px;height:" +
      REPORT_PAGE_HEIGHT_PX +
      "px;border:0;background:#ffffff;";
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      iframe.remove();
      reject(new Error("Timed out isolating report HTML for PDF"));
    }, 8000);
    iframe.addEventListener("load", () => {
      const paper = iframe.contentDocument?.getElementById("report-paper");
      if (!paper || settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve({ iframe, paper });
    });
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}

export const REPORT_PDF_IMAGE_FORMAT = "JPEG";
export const REPORT_PDF_JPEG_QUALITY = 0.85;
export const REPORT_PDF_IMAGE_COMPRESSION = "FAST" as const;

export type PdfPageSlice = {
  sourceY: number;
  sliceHeight: number;
  destHeightMm: number;
};

/**
 * Page-sized crops of a tall html2canvas bitmap so each PDF page embeds only
 * its slice (JPEG), instead of the full PNG on every page.
 */
export function pdfPageSlicesForCanvas(
  canvasWidth: number,
  canvasHeight: number,
  pageWidthMm: number,
  pageHeightMm: number,
): PdfPageSlice[] {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return [{ sourceY: 0, sliceHeight: 1, destHeightMm: pageHeightMm }];
  }

  const imgHeightMm = (canvasHeight * pageWidthMm) / canvasWidth;
  const pxPerMm = canvasWidth / pageWidthMm;
  const pageCount = Math.max(1, Math.ceil(imgHeightMm / pageHeightMm - 1e-6));
  const slices: PdfPageSlice[] = [];

  for (let i = 0; i < pageCount; i++) {
    const sourceY = Math.min(
      canvasHeight,
      Math.floor(i * pageHeightMm * pxPerMm),
    );
    const nextY =
      i === pageCount - 1
        ? canvasHeight
        : Math.min(canvasHeight, Math.floor((i + 1) * pageHeightMm * pxPerMm));
    const sliceHeight = Math.max(1, nextY - sourceY);
    slices.push({
      sourceY,
      sliceHeight,
      destHeightMm: sliceHeight / pxPerMm,
    });
  }

  return slices;
}

function canvasSliceToJpeg(
  source: HTMLCanvasElement,
  slice: PdfPageSlice,
): string {
  const pageCanvas = document.createElement("canvas");
  pageCanvas.width = source.width;
  pageCanvas.height = slice.sliceHeight;
  const ctx = pageCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create PDF page canvas");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
  ctx.drawImage(
    source,
    0,
    slice.sourceY,
    source.width,
    slice.sliceHeight,
    0,
    0,
    source.width,
    slice.sliceHeight,
  );
  return pageCanvas.toDataURL("image/jpeg", REPORT_PDF_JPEG_QUALITY);
}

export async function htmlToPdfBlob(html: string): Promise<Blob> {
  const isolatedHtml = buildIsolatedReportHtml(html);
  const { iframe, paper } = await loadIframeDocument(isolatedHtml);
  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(paper, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: REPORT_PAGE_WIDTH_PX,
      onclone: (clonedDoc) => {
        stripUnsupportedColorsFromClone(clonedDoc);
      },
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const slices = pdfPageSlicesForCanvas(
      canvas.width,
      canvas.height,
      pageWidth,
      pageHeight,
    );

    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      if (!slice) continue;
      if (i > 0) pdf.addPage();
      const imgData = canvasSliceToJpeg(canvas, slice);
      pdf.addImage(
        imgData,
        REPORT_PDF_IMAGE_FORMAT,
        0,
        0,
        pageWidth,
        slice.destHeightMm,
        undefined,
        REPORT_PDF_IMAGE_COMPRESSION,
      );
    }

    return pdf.output("blob");
  } finally {
    iframe.remove();
  }
}

export function sanitizeReportFilename(value: string): string {
  return value.trim().replace(/[<>:"/\\|?*]/g, "") || "relatorio";
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
