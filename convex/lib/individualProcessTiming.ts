import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";
const STATUS_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;

const businessDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getBusinessDateTimeParts(timestamp: number) {
  const parts = businessDateTimeFormatter.formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

/**
 * Converts the local datetime stored by process statuses into an absolute
 * timestamp while preserving the business timezone. Date-only legacy values
 * use noon so they cannot cross a calendar-day boundary when rendered.
 */
export function processStatusDateTimeToTimestamp(
  value: string,
): number | undefined {
  const match = STATUS_DATE_TIME_PATTERN.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] === undefined ? 12 : Number(match[4]);
  const minute = match[5] === undefined ? 0 : Number(match[5]);
  const desiredWallClock = Date.UTC(year, month - 1, day, hour, minute);
  const parsed = new Date(desiredWallClock);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCHours() !== hour ||
    parsed.getUTCMinutes() !== minute
  ) {
    return undefined;
  }

  let timestamp = desiredWallClock;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const businessParts = getBusinessDateTimeParts(timestamp);
    const representedWallClock = Date.UTC(
      businessParts.year,
      businessParts.month - 1,
      businessParts.day,
      businessParts.hour,
      businessParts.minute,
      businessParts.second,
    );
    const adjustment = desiredWallClock - representedWallClock;
    timestamp += adjustment;
    if (adjustment === 0) break;
  }

  return timestamp;
}

/**
 * Returns the business creation instant shown as the first entry in the
 * process status history. The technical row timestamp remains a safe fallback
 * for legacy processes without an initial status.
 */
export async function getIndividualProcessCreationTimestamp(
  ctx: Pick<QueryCtx, "db">,
  individualProcess: Doc<"individualProcesses">,
): Promise<number> {
  const initialStatus = await ctx.db
    .query("individualProcessStatuses")
    .withIndex("by_individualProcess", (q) =>
      q.eq("individualProcessId", individualProcess._id),
    )
    .order("asc")
    .first();

  if (!initialStatus) return individualProcess.createdAt;

  return (
    (initialStatus.date
      ? processStatusDateTimeToTimestamp(initialStatus.date)
      : undefined) ??
    initialStatus.changedAt ??
    initialStatus.createdAt ??
    individualProcess.createdAt
  );
}
