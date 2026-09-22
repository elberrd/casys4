import { suggestedReportFilename } from "@/lib/report-templates/format-values";
import { fillRemainingReportPlaceholders } from "@/lib/report-templates/substitute";
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

  const sourceHtml = args.saved
    ? args.saved.contentHtml
    : args.attached
      ? args.attached.contentHtml
      : args.templateHtml;
  const fromSavedEdit = Boolean(args.saved || args.attached);

  return {
    html: fillRemainingReportPlaceholders(
      sourceHtml,
      args.templateHtml,
      args.values,
    ),
    filename: args.saved
      ? args.saved.filename || suggested
      : args.attached
        ? args.attached.filename || suggested
        : suggested,
    fromSavedEdit,
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
