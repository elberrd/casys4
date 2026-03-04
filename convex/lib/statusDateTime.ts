const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatNowDateTime(now: number = Date.now()): string {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Normalize status date to ISO local datetime format (YYYY-MM-DDTHH:mm).
 * Accepts legacy date-only values for backward compatibility.
 */
export function normalizeStatusDateTime(input?: string, now: number = Date.now()): string {
  if (!input) {
    return formatNowDateTime(now);
  }

  if (DATE_TIME_REGEX.test(input)) {
    return input;
  }

  if (DATE_ONLY_REGEX.test(input)) {
    const current = new Date(now);
    return `${input}T${pad2(current.getHours())}:${pad2(current.getMinutes())}`;
  }

  throw new Error("Invalid date format. Expected YYYY-MM-DD or YYYY-MM-DDTHH:mm");
}
