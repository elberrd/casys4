export const DOCUMENT_STATUS = {
  notStarted: "not_started",
  uploaded: "uploaded",
  underReview: "under_review",
  awaitingSignature: "awaiting_signature",
  approved: "approved",
  rejected: "rejected",
} as const;

export type DocumentStatus =
  (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

type ResolveUploadStatusArgs = {
  hasFile: boolean;
  awaitingSignature: boolean;
  isIllegible: boolean;
  canAutoApprove: boolean;
};

/**
 * Resolves the lifecycle status for a newly received document version.
 * Signature waiting is intentionally evaluated before approval so a draft
 * that still needs to return signed can never be completed by accident.
 */
export function resolveDocumentUploadStatus({
  hasFile,
  awaitingSignature,
  isIllegible,
  canAutoApprove,
}: ResolveUploadStatusArgs): DocumentStatus {
  if (!hasFile) return DOCUMENT_STATUS.notStarted;
  if (isIllegible) return DOCUMENT_STATUS.rejected;
  if (awaitingSignature) return DOCUMENT_STATUS.awaitingSignature;
  if (canAutoApprove) return DOCUMENT_STATUS.approved;
  return DOCUMENT_STATUS.uploaded;
}

export function isAwaitingSignature(status: string): boolean {
  return status === DOCUMENT_STATUS.awaitingSignature;
}

export function requiresSignedVersionForTransition(
  currentStatus: string,
  nextStatus: string,
): boolean {
  return (
    isAwaitingSignature(currentStatus) &&
    nextStatus !== DOCUMENT_STATUS.awaitingSignature &&
    nextStatus !== DOCUMENT_STATUS.rejected
  );
}
