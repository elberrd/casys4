import type { Doc, Id } from "../_generated/dataModel";

export type ExigenciaOccurrence = {
  date?: string;
  changedAt: number;
};

export function getManualExigenciaStatusId(
  document: Doc<"documentsDelivered">,
  exigenciaOccurrences: ReadonlyMap<
    Id<"individualProcessStatuses">,
    ExigenciaOccurrence
  >,
): Id<"individualProcessStatuses"> | undefined {
  const statusId = document.individualProcessStatusId;
  return statusId && exigenciaOccurrences.has(statusId) ? statusId : undefined;
}

function getDocumentVersionChainKey(
  document: Doc<"documentsDelivered">,
): string {
  if (!document.documentTypeId) {
    const looseName = document.documentName?.trim().toLocaleLowerCase();
    return looseName ? `loose-name:${looseName}` : `loose:${document._id}`;
  }

  return [
    `type:${document.documentTypeId}`,
    `requirement:${document.documentRequirementId ?? "none"}`,
  ].join("|");
}

function compareOccurrences(
  first: ExigenciaOccurrence,
  second: ExigenciaOccurrence,
): number {
  const firstDate = first.date ? Date.parse(first.date) : Number.NaN;
  const secondDate = second.date ? Date.parse(second.date) : Number.NaN;
  const firstTimestamp = Number.isNaN(firstDate) ? first.changedAt : firstDate;
  const secondTimestamp = Number.isNaN(secondDate)
    ? second.changedAt
    : secondDate;

  return firstTimestamp - secondTimestamp || first.changedAt - second.changedAt;
}

/**
 * Keeps one representative version for each document, exclusively in its most
 * recent manually linked Exigencia occurrence. Within that occurrence, the
 * highest version wins. `processStatusAtUpload` is deliberately ignored here:
 * it records historical context for "By progress", not Exigencia membership.
 */
export function selectLatestVersionsByExigenciaOccurrence(
  documents: Array<Doc<"documentsDelivered">>,
  exigenciaOccurrences: ReadonlyMap<
    Id<"individualProcessStatuses">,
    ExigenciaOccurrence
  >,
): Array<Doc<"documentsDelivered">> {
  const selected = new Map<
    string,
    {
      document: Doc<"documentsDelivered">;
      statusId: Id<"individualProcessStatuses">;
      occurrence: ExigenciaOccurrence;
    }
  >();

  for (const document of documents) {
    const statusId = getManualExigenciaStatusId(
      document,
      exigenciaOccurrences,
    );
    if (!statusId) continue;

    const occurrence = exigenciaOccurrences.get(statusId)!;
    const key = getDocumentVersionChainKey(document);
    const existing = selected.get(key);
    const occurrenceComparison = existing
      ? compareOccurrences(occurrence, existing.occurrence)
      : 1;
    if (
      !existing ||
      occurrenceComparison > 0 ||
      (occurrenceComparison === 0 && statusId > existing.statusId) ||
      (statusId === existing.statusId &&
        (document.version > existing.document.version ||
          (document.version === existing.document.version &&
            document.uploadedAt > existing.document.uploadedAt)))
    ) {
      selected.set(key, { document, statusId, occurrence });
    }
  }

  return Array.from(selected.values(), ({ document }) => document);
}
