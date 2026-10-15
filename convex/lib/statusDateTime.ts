const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Business timezone for naive status datetimes (YYYY-MM-DDTHH:mm). */
export const STATUS_BUSINESS_TIME_ZONE = "America/Sao_Paulo";

function saoPauloDateTimeParts(now: number): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STATUS_BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: values.year ?? "0000",
    month: values.month ?? "01",
    day: values.day ?? "01",
    hour: values.hour ?? "00",
    minute: values.minute ?? "00",
  };
}

/**
 * Current business wall-clock as YYYY-MM-DDTHH:mm in America/Sao_Paulo.
 * Convex (and other UTC runtimes) must not use Date#getHours(), which would
 * persist UTC hours labeled as local time.
 */
export function formatNowDateTime(now: number = Date.now()): string {
  const parts = saoPauloDateTimeParts(now);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Normalize status date to ISO local datetime format (YYYY-MM-DDTHH:mm)
 * in America/Sao_Paulo. Accepts legacy date-only values for backward
 * compatibility. Does not rewrite already-stored YYYY-MM-DDTHH:mm strings.
 */
export function normalizeStatusDateTime(input?: string, now: number = Date.now()): string {
  if (!input) {
    return formatNowDateTime(now);
  }

  if (DATE_TIME_REGEX.test(input)) {
    return input;
  }

  if (DATE_ONLY_REGEX.test(input)) {
    const parts = saoPauloDateTimeParts(now);
    return `${input}T${parts.hour}:${parts.minute}`;
  }

  throw new Error("Invalid date format. Expected YYYY-MM-DD or YYYY-MM-DDTHH:mm");
}

/**
 * Format a stored naive status datetime as wall-clock, without converting
 * through the runtime timezone. Existing rows that were saved with UTC hours
 * still display those hours until a follow-up data migration.
 */
export function formatStoredStatusDateTime(
  raw: string,
  locale: string,
): string | null {
  const localeTag = locale === "en" ? "en-US" : "pt-BR";

  if (DATE_TIME_REGEX.test(raw)) {
    const datePart = raw.slice(0, 10);
    const timePart = raw.slice(11);
    const year = Number(datePart.slice(0, 4));
    const month = Number(datePart.slice(5, 7));
    const day = Number(datePart.slice(8, 10));
    const hour = Number(timePart.slice(0, 2));
    const minute = Number(timePart.slice(3, 5));
    const asUtc = Date.UTC(year, month - 1, day, hour, minute);
    return new Intl.DateTimeFormat(localeTag, {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(asUtc));
  }

  if (DATE_ONLY_REGEX.test(raw)) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(5, 7));
    const day = Number(raw.slice(8, 10));
    const asUtc = Date.UTC(year, month - 1, day, 12);
    return new Intl.DateTimeFormat(localeTag, {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(asUtc));
  }

  return null;
}
