const PREVIEW_TABLE_STYLES = `
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 600; }
  p { margin: 0 0 0.75em; }
  h1, h2, h3 { margin: 0 0 0.6em; line-height: 1.25; color: #111827; }
  ul, ol { margin: 0 0 0.75em; padding-left: 1.4em; }
  blockquote { margin: 0 0 0.75em; padding-left: 12px; border-left: 3px solid #d1d5db; color: #4b5563; }
  hr { border: none; border-top: 1px solid #d1d5db; margin: 16px 0; }
`;

function createOffscreenPaper(html: string): { host: HTMLDivElement; paper: HTMLDivElement } {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-12000px;top:0;width:794px;background:#ffffff;z-index:-1;";
  const paper = document.createElement("div");
  paper.style.cssText = [
    "width:794px",
    "box-sizing:border-box",
    "padding:64px 56px",
    "background:#ffffff",
    "color:#111827",
    "font-family:'Times New Roman',Times,serif",
    "font-size:16px",
    "line-height:1.6",
  ].join(";");
  const style = document.createElement("style");
  style.textContent = PREVIEW_TABLE_STYLES;
  paper.appendChild(style);
  const body = document.createElement("div");
  body.innerHTML = html;
  paper.appendChild(body);
  host.appendChild(paper);
  document.body.appendChild(host);
  return { host, paper };
}

export async function htmlToPdfBlob(html: string): Promise<Blob> {
  const { host, paper } = createOffscreenPaper(html);
  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(paper, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
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
    host.remove();
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
