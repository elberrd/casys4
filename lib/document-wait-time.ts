const DAY_IN_MS = 24 * 60 * 60 * 1000;
const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

export interface DocumentTimingLike {
  _creationTime: number;
  createdAt?: number;
  receivedAt?: number;
  uploadedAt?: number;
  waitingEndedAt?: number;
  storageId?: unknown;
  fileUrl: string;
  mimeType?: string;
  status: string;
  isLatest: boolean;
}

export type DocumentWaitTime = {
  state: "pending" | "received" | "superseded";
  days: number;
  createdAt: number;
  receivedAt?: number;
  waitingEndedAt?: number;
};

function getDateParts(timestamp: number): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function getCalendarDay(timestamp: number): number {
  const { year, month, day } = getDateParts(timestamp);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
}

export function hasDocumentContentForTiming(document: DocumentTimingLike): boolean {
  return (
    document.storageId !== undefined ||
    document.fileUrl.trim().length > 0 ||
    (document.mimeType === "application/x-info-only" &&
      document.status !== "not_started")
  );
}

export function getDocumentWaitTime(
  document: DocumentTimingLike,
  now = Date.now(),
): DocumentWaitTime {
  const createdAt = document.createdAt ?? document._creationTime;
  const hasContent = hasDocumentContentForTiming(document);
  const receivedAt =
    document.receivedAt ?? (hasContent ? document.uploadedAt : undefined);
  const waitingEndedAt = receivedAt === undefined ? document.waitingEndedAt : undefined;
  const endAt = receivedAt ?? waitingEndedAt ?? now;
  const days = Math.max(0, getCalendarDay(endAt) - getCalendarDay(createdAt));

  return {
    state: receivedAt !== undefined
      ? "received"
      : waitingEndedAt !== undefined || !document.isLatest
        ? "superseded"
        : "pending",
    days,
    createdAt,
    receivedAt,
    waitingEndedAt,
  };
}

export function formatDocumentTimingDate(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "short",
  }).format(new Date(timestamp));
}

export function timestampToIsoDate(timestamp: number): string {
  const { year, month, day } = getDateParts(timestamp);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
