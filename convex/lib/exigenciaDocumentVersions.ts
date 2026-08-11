import { Doc, Id } from "../_generated/dataModel";

export function getExigenciaSnapshotStatusId(
  document: Doc<"documentsDelivered">,
): Id<"individualProcessStatuses"> | undefined {
  const snapshot = document.processStatusAtUpload;
  if (snapshot?.code.trim().toLowerCase() !== "exigencia") {
    return undefined;
  }

  return snapshot.individualProcessStatusId;
}

function getDocumentVersionChainKey(
  document: Doc<"documentsDelivered">,
): string {
  if (!document.documentTypeId) {
    return `loose:${document._id}`;
  }

  return [
    `type:${document.documentTypeId}`,
    `requirement:${document.documentRequirementId ?? "none"}`,
  ].join("|");
}

/**
 * Keeps one representative version for each document inside each immutable
 * Exigencia occurrence. The current version is still selected independently
 * through `isLatest`; this selection only preserves the historical occurrence
 * rows that would otherwise disappear from the checklist.
 */
export function selectLatestVersionsByExigenciaOccurrence(
  documents: Array<Doc<"documentsDelivered">>,
): Array<Doc<"documentsDelivered">> {
  const selected = new Map<string, Doc<"documentsDelivered">>();

  for (const document of documents) {
    const statusId = getExigenciaSnapshotStatusId(document);
    if (!statusId) continue;

    const key = `${statusId}|${getDocumentVersionChainKey(document)}`;
    const existing = selected.get(key);
    if (
      !existing ||
      document.version > existing.version ||
      (document.version === existing.version &&
        document.uploadedAt > existing.uploadedAt)
    ) {
      selected.set(key, document);
    }
  }

  return Array.from(selected.values());
}
