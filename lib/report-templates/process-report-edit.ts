import { suggestedReportFilename } from "@/lib/report-templates/format-values";
import { substituteReportVariables } from "@/lib/report-templates/substitute";
import type { ReportVariableKey } from "@/lib/report-templates/variables";

export interface ProcessReportSavedEdit {
  contentHtml: string;
  filename: string;
}

export type ReportVersionContentSource = {
  contentHtml?: string;
  fileName: string;
  version: number;
  reportTemplateId?: string;
  documentTypeId?: string;
};

/** Preview skips Convex deploy; these helpers still work once Ship deploys prod. */
export function reportFilenameFromDocument(fileName: string): string {
  return fileName.replace(/\.(pdf|docx)$/i, "");
}

export function pickLatestReportContent<T extends ReportVersionContentSource>(
  documents: readonly T[],
  filter: {
    reportTemplateId?: string;
    documentTypeId?: string;
  },
): T | null {
  const withHtml = documents.filter((document) =>
    Boolean(document.contentHtml?.trim()),
  );
  if (withHtml.length === 0) return null;

  const byTemplate = filter.reportTemplateId
    ? withHtml.filter(
        (document) => document.reportTemplateId === filter.reportTemplateId,
      )
    : [];
  const byType = filter.documentTypeId
    ? withHtml.filter(
        (document) => document.documentTypeId === filter.documentTypeId,
      )
    : [];
  const pool = byTemplate.length > 0 ? byTemplate : byType;
  if (pool.length === 0) return null;

  return pool.reduce((latest, current) =>
    current.version >= latest.version ? current : latest,
  );
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
