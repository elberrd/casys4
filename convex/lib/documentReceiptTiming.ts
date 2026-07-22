import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";

type DocumentContentFields = Pick<
  Doc<"documentsDelivered">,
  "storageId" | "fileUrl" | "mimeType" | "status"
>;

type DocumentTimingFields = Pick<
  Doc<"documentsDelivered">,
  | "_creationTime"
  | "createdAt"
  | "waitingStartedAt"
  | "receivedAt"
  | "uploadedAt"
> &
  DocumentContentFields;

export function isValidIsoDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function hasDocumentContent(document: DocumentContentFields): boolean {
  return (
    document.storageId !== undefined ||
    document.fileUrl.trim().length > 0 ||
    (document.mimeType === "application/x-info-only" &&
      document.status !== "not_started")
  );
}

export function getDocumentCreatedAt(document: DocumentTimingFields): number {
  return document.createdAt ?? document._creationTime;
}

export function getDocumentWaitingStartedAt(
  document: DocumentTimingFields,
): number {
  return (
    document.waitingStartedAt ??
    document.createdAt ??
    document._creationTime
  );
}

export function getDocumentReceivedAt(
  document: DocumentTimingFields,
): number | undefined {
  if (document.receivedAt !== undefined) return document.receivedAt;
  return hasDocumentContent(document) ? document.uploadedAt : undefined;
}

function isoDateToTimestamp(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day, 12);
}

/**
 * Resolves the business start of the waiting-time counter. The process
 * creation timestamp is authoritative unless an administrator explicitly
 * supplies a valid calendar-date override.
 */
export function resolveDocumentWaitingStartedAt({
  requestedDate,
  userRole,
  processCreatedAt,
}: {
  requestedDate?: string;
  userRole: "admin" | "client";
  processCreatedAt: number;
}): number {
  if (!requestedDate) return processCreatedAt;

  if (userRole !== "admin") {
    throw new ConvexError({
      code: "WAITING_START_DATE_ADMIN_ONLY",
      message: "Only administrators can set the document waiting start date",
    });
  }

  if (!isValidIsoDate(requestedDate)) {
    throw new ConvexError({
      code: "INVALID_WAITING_START_DATE",
      message: "Waiting start date must be a valid date in YYYY-MM-DD format",
    });
  }

  return isoDateToTimestamp(requestedDate);
}

/**
 * Resolves the receipt timestamp used by upload/fill mutations. The server owns
 * the default; only admins may override it with a calendar date.
 */
export function resolveDocumentReceivedAt({
  requestedDate,
  userRole,
  now = Date.now(),
}: {
  requestedDate?: string;
  userRole: "admin" | "client";
  now?: number;
}): number {
  if (!requestedDate) return now;

  if (userRole !== "admin") {
    throw new ConvexError({
      code: "RECEIVED_DATE_ADMIN_ONLY",
      message: "Only administrators can set the document receipt date",
    });
  }

  if (!isValidIsoDate(requestedDate)) {
    throw new ConvexError({
      code: "INVALID_RECEIVED_DATE",
      message: "Receipt date must be a valid date in YYYY-MM-DD format",
    });
  }

  return isoDateToTimestamp(requestedDate);
}
