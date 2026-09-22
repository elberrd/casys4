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
