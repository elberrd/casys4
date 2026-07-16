import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

type DocumentContentFields = Pick<
  Doc<"documentsDelivered">,
  "storageId" | "fileUrl" | "mimeType" | "status"
>;

type DocumentTimingFields = Pick<
  Doc<"documentsDelivered">,
  "_creationTime" | "createdAt" | "receivedAt" | "uploadedAt"
> &
  DocumentContentFields;

function getBusinessDateKey(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

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

export function getDocumentReceivedAt(
  document: DocumentTimingFields,
): number | undefined {
  if (document.receivedAt !== undefined) return document.receivedAt;
  return hasDocumentContent(document) ? document.uploadedAt : undefined;
}

/**
 * Resolves the receipt timestamp used by upload/fill mutations. The server owns
 * the default; only admins may override it with a calendar date.
 */
export function resolveDocumentReceivedAt({
  createdAt,
  requestedDate,
  userRole,
  now = Date.now(),
}: {
  createdAt: number;
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

  const createdDate = getBusinessDateKey(createdAt);
  const currentDate = getBusinessDateKey(now);
  if (requestedDate < createdDate || requestedDate > currentDate) {
    throw new ConvexError({
      code: "RECEIVED_DATE_OUT_OF_RANGE",
      message: "Receipt date must be between the version creation date and today",
    });
  }

  const [year, month, day] = requestedDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day, 12);
}
