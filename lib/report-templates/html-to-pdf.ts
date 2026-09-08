const PREVIEW_TABLE_STYLES = `
  html, body { margin: 0; padding: 0; background: #ffffff; }
  #report-paper {
    width: 794px;
    box-sizing: border-box;
    padding: 64px 56px;
    background: #ffffff;
    color: #111827;
    font-family: "Times New Roman", Times, serif;
    font-size: 16px;
    line-height: 1.6;
  }
  #report-paper table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  #report-paper th, #report-paper td {
    border: 1px solid #d1d5db;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  #report-paper th { background: #f3f4f6; font-weight: 600; }
  #report-paper p { margin: 0 0 0.75em; }
  #report-paper h1, #report-paper h2, #report-paper h3 {
    margin: 0 0 0.6em;
    line-height: 1.25;
    color: #111827;
  }
  #report-paper ul, #report-paper ol { margin: 0 0 0.75em; padding-left: 1.4em; }
  #report-paper blockquote {
    margin: 0 0 0.75em;
    padding-left: 12px;
    border-left: 3px solid #d1d5db;
    color: #4b5563;
  }
  #report-paper hr { border: none; border-top: 1px solid #d1d5db; margin: 16px 0; }
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
  const content = sanitizeReportHtmlForPdf(bodyHtml || "");
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
      "position:fixed;left:-12000px;top:0;width:794px;height:1123px;border:0;background:#ffffff;";
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
      windowWidth: 794,
      onclone: (clonedDoc) => {
        stripUnsupportedColorsFromClone(clonedDoc);
      },
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/png");

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
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
