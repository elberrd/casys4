import { suggestedReportFilename } from "@/lib/report-templates/format-values";
import { substituteReportVariables } from "@/lib/report-templates/substitute";
import type { ReportVariableKey } from "@/lib/report-templates/variables";

export interface ProcessReportSavedEdit {
  contentHtml: string;
  filename: string;
}

// Preview deploys skip Convex (`scripts/vercel-build.sh`), so
// processReportEdits is not on production Convex. Reopen (86akn4c1e) no-ops
// there until a production Convex deploy; the UI already falls back to the template.
export function resolveProcessReportEditorContent(args: {
  saved: ProcessReportSavedEdit | null;
  templateHtml: string;
  templateName: string;
  values: Partial<Record<ReportVariableKey, string>>;
  todayIso: string;
}): {
  html: string;
  filename: string;
  fromSavedEdit: boolean;
} {
  const suggested = suggestedReportFilename({
    templateName: args.templateName,
    personName: args.values.personName ?? "",
    todayIso: args.todayIso,
  });

  if (args.saved) {
    return {
      html: args.saved.contentHtml,
      filename: args.saved.filename || suggested,
      fromSavedEdit: true,
    };
  }

  return {
    html: substituteReportVariables(args.templateHtml, args.values),
    filename: suggested,
    fromSavedEdit: false,
  };
}

export function shouldPersistProcessReportEdit(args: {
  html: string;
  filename: string;
  lastPersistedHtml: string;
  lastPersistedFilename: string;
}): boolean {
  return (
    args.html !== args.lastPersistedHtml ||
    args.filename !== args.lastPersistedFilename
  );
}
