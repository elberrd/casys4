export type ReportDocumentTypeLink = {
  _id: string;
  name: string;
};

export type ReportAttachProcessDocument = {
  documentTypeId?: string;
  documentRequirementId?: string;
  isLatest?: boolean;
  status?: string;
};

export type ReportAttachOption<
  DocumentTypeId extends string = string,
  RequirementId extends string = string,
> = {
  documentTypeId: DocumentTypeId;
  label: string;
  documentRequirementId?: RequirementId;
};

export function formatLinkedDocumentTypeNames(
  documentTypes: ReadonlyArray<{ name: string }>,
): string {
  return documentTypes.map((item) => item.name).join(" · ");
}

export function reportsForDocumentType<
  T extends {
    documentTypeIds?: readonly string[];
    documentTypes?: ReadonlyArray<{ _id: string }>;
  },
>(reports: readonly T[], documentTypeId: string): T[] {
  return reports.filter((report) => {
    if (report.documentTypes && report.documentTypes.length > 0) {
      return report.documentTypes.some((item) => item._id === documentTypeId);
    }
    return report.documentTypeIds?.includes(documentTypeId) ?? false;
  });
}

export function findProcessDocumentForReportAttach<
  T extends ReportAttachProcessDocument,
>(processDocuments: readonly T[], documentTypeId: string): T | undefined {
  const latest = processDocuments.filter(
    (document) =>
      document.documentTypeId === documentTypeId &&
      document.isLatest !== false,
  );
  return (
    latest.find((document) => document.status === "not_started") ?? latest[0]
  );
}

export function buildReportAttachOptions<
  DocumentTypeId extends string,
  RequirementId extends string,
>(args: {
  documentTypes: ReadonlyArray<{ _id: DocumentTypeId; name: string }>;
  processDocuments: ReadonlyArray<{
    documentTypeId?: DocumentTypeId;
    documentRequirementId?: RequirementId;
    isLatest?: boolean;
    status?: string;
  }>;
}): Array<ReportAttachOption<DocumentTypeId, RequirementId>> {
  return args.documentTypes.map((documentType) => {
    const matching = findProcessDocumentForReportAttach(
      args.processDocuments,
      documentType._id,
    );
    return {
      documentTypeId: documentType._id,
      label: documentType.name,
      documentRequirementId: matching?.documentRequirementId,
    };
  });
}
