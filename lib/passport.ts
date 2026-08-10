export type PassportValidityStatus = "Valid" | "Expiring Soon" | "Expired";

interface FileAttachment {
  storageId?: unknown;
  fileUrl?: string | null;
}

interface DeliveredPassportDocument extends FileAttachment {
  documentType?: {
    isOfficialPassport?: boolean;
  } | null;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(date: string) {
  const match = ISO_DATE_PATTERN.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function addMonthsClamped(date: Date, months: number) {
  const targetMonthIndex = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    targetYear,
    targetMonth + 1,
    0,
  ).getDate();

  return new Date(
    targetYear,
    targetMonth,
    Math.min(date.getDate(), lastDayOfTargetMonth),
  );
}

function localDateToIso(date: Date) {
  return formatIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Calculates passport validity from the calendar date only. `isActive` is not
 * considered because it represents which passport is current for the person,
 * not whether the document has expired.
 */
export function getPassportValidityStatus(
  expiryDate: string | null | undefined,
  referenceDate: Date = new Date(),
): PassportValidityStatus | null {
  if (
    !expiryDate ||
    !parseIsoDate(expiryDate) ||
    Number.isNaN(referenceDate.getTime())
  ) {
    return null;
  }

  const today = localDateToIso(referenceDate);
  const sixMonthsFromToday = localDateToIso(addMonthsClamped(referenceDate, 6));

  if (expiryDate < today) return "Expired";
  if (expiryDate < sixMonthsFromToday) return "Expiring Soon";
  return "Valid";
}

export function hasFileAttachment(
  attachment: FileAttachment | null | undefined,
): boolean {
  return Boolean(
    attachment?.storageId ||
      (typeof attachment?.fileUrl === "string" &&
        attachment.fileUrl.trim().length > 0),
  );
}

/**
 * A process has received its passport file when it exists either on the
 * passport record itself or on the process's official passport document.
 */
export function hasPassportFile(
  passport: FileAttachment | null | undefined,
  deliveredDocuments: readonly DeliveredPassportDocument[] | undefined,
): boolean {
  if (hasFileAttachment(passport)) return true;

  return Boolean(
    deliveredDocuments?.some(
      (document) =>
        document.documentType?.isOfficialPassport === true &&
        hasFileAttachment(document),
    ),
  );
}
