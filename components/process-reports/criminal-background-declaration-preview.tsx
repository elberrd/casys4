import type { CriminalBackgroundDeclaration, ReportRun } from "@/lib/process-reports/types"

function InlineRuns({ runs }: { runs: ReportRun[] }) {
  return (
    <>
      {runs.map((run, index) => (
        <span
          key={`${index}-${run.text.slice(0, 12)}`}
          className={run.bold ? "font-bold" : undefined}
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

        <div className="mb-8 pl-12">
          <p className="mb-6">{report.closingStatement}</p>
          <p className="mb-0 leading-[1.15]">
            {report.petitionLines.map((line, index) => (
              <span key={line}>
                {index > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </p>
        </div>

        <p className="mt-10 text-center">
          <InlineRuns runs={report.locationDate} />
        </p>

        <p className="mt-16 text-center font-bold tracking-wide">
          {report.signatureName}
        </p>
      </div>
    </article>
  )
}
