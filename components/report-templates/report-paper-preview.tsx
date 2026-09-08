"use client";

import { cn } from "@/lib/utils";

const PREVIEW_STYLES = `
  color: #111827;
  font-family: "Times New Roman", Times, serif;
  font-size: 16px;
  line-height: 1.65;
`;

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
        "overflow-auto rounded-lg border bg-neutral-200/80 p-4 dark:bg-neutral-900",
        className,
      )}
    >
      <article
        aria-label={ariaLabel}
        className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[18mm] py-[20mm] text-neutral-900 shadow-lg"
        style={{ color: "#111827" }}
      >
        <div
          className="report-paper-preview"
          style={{ color: "#111827" }}
          dangerouslySetInnerHTML={{
            __html: `<style>
              .report-paper-preview { ${PREVIEW_STYLES} }
              .report-paper-preview table { border-collapse: collapse; width: 100%; margin: 12px 0; }
              .report-paper-preview th, .report-paper-preview td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; vertical-align: top; }
              .report-paper-preview th { background: #f3f4f6; font-weight: 600; }
              .report-paper-preview p { margin: 0 0 0.75em; }
              .report-paper-preview h1, .report-paper-preview h2, .report-paper-preview h3 { margin: 0 0 0.55em; line-height: 1.25; }
              .report-paper-preview ul, .report-paper-preview ol { margin: 0 0 0.75em; padding-left: 1.4em; }
              .report-paper-preview blockquote { margin: 0 0 0.75em; padding-left: 12px; border-left: 3px solid #d1d5db; color: #4b5563; }
              .report-paper-preview hr { border: none; border-top: 1px solid #d1d5db; margin: 16px 0; }
              .report-paper-preview .report-variable { background: #e0f2fe; border: 1px solid #7dd3fc; border-radius: 4px; padding: 0 4px; }
            </style>${html || ""}`,
          }}
        />
      </article>
    </div>
  );
}
