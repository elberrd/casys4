import { suggestedReportFilename } from "@/lib/report-templates/format-values";
import { substituteReportVariables } from "@/lib/report-templates/substitute";
import type { ReportVariableKey } from "@/lib/report-templates/variables";

export type { ReportVersionContentSource } from "./process-report-content";
export {
  pickLatestReportContent,
  reportFilenameFromDocument,
} from "./process-report-content";

export interface ProcessReportSavedEdit {
  contentHtml: string;
  filename: string;
}

export function resolveProcessReportEditorContent(args: {
  saved: ProcessReportSavedEdit | null;
  attached?: ProcessReportSavedEdit | null;
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

  if (args.attached) {
    return {
      html: args.attached.contentHtml,
      filename: args.attached.filename || suggested,
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

export async function uploadDocumentKeepingHtmlFallback<TArgs extends object>(
  upload: (args: TArgs) => Promise<unknown>,
  args: TArgs,
): Promise<unknown> {
  try {
    return await upload(args);
  } catch (error) {
    if (!("contentHtml" in args)) throw error;
    const rest = { ...args };
    delete (rest as { contentHtml?: string }).contentHtml;
    delete (rest as { reportTemplateId?: string }).reportTemplateId;
    return await upload(rest);
  }
}
