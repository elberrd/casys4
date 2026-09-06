import type { CriminalBackgroundDeclaration, ReportRun } from "@/lib/process-reports/types"
import { cn } from "@/lib/utils"

function InlineRuns({ runs }: { runs: ReportRun[] }) {
  return (
    <>
      {runs.map((run, index) => (
        <span
          key={`${index}-${run.text.slice(0, 12)}`}
          className={cn(
            run.bold && "font-bold",
            run.highlight && "bg-yellow-200 px-0.5 rounded-[2px]",
          )}
        >
          {run.text}
        </span>
      ))}
    </>
  )
}

interface CriminalBackgroundDeclarationPreviewProps {
  report: CriminalBackgroundDeclaration
  ariaLabel: string
}

export function CriminalBackgroundDeclarationPreview({
  report,
  ariaLabel,
}: CriminalBackgroundDeclarationPreviewProps) {
  return (
    <article
      aria-label={ariaLabel}
      className="mx-auto w-full max-w-[210mm] bg-white text-black shadow-sm"
    >
      <div
        className="px-[25mm] py-[25mm] font-serif text-[16px] leading-8"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <h2 className="mb-10 text-center text-xl font-bold uppercase underline decoration-1 underline-offset-4">
          {report.title}
        </h2>

        <div className="mb-8 space-y-0">
          {report.recipientLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <p className="mb-8">{report.salutation}</p>

        <p className="mb-8 text-justify indent-8">
          <InlineRuns runs={report.body} />
        </p>

        {report.closingLines.map((line) => (
          <p key={line} className="mb-1">
            {line}
          </p>
        ))}

        <p className="mt-10">
          <InlineRuns runs={report.locationDate} />
        </p>

        <p className="mt-16 text-center font-bold tracking-wide">
          {report.signatureName}
        </p>
      </div>
    </article>
  )
}
