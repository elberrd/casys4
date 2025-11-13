/**
 * Utility function to format field values for display
 * Handles different field types (string, date, datetime, reference)
 */

/**
 * Format a date string in locale-aware format
 * Handles "YYYY-MM-DD" format correctly without timezone issues
 */
export function formatDate(dateString: string, locale: string = "en"): string {
  try {
    // Map locale to full locale string for Intl.DateTimeFormat
    const fullLocale = locale === "pt" ? "pt-BR" : "en-US";

    // Handle "YYYY-MM-DD" format by parsing as local date to avoid timezone issues
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (isNaN(date.getTime())) {
        return dateString; // Return as-is if invalid
      }
      return new Intl.DateTimeFormat(fullLocale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    }

    // Fallback for other date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if invalid
    }
    return new Intl.DateTimeFormat(fullLocale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format a datetime string in locale-aware format
 */
export function formatDateTime(dateTimeString: string, locale: string = "en"): string {
  try {
    // Map locale to full locale string for Intl.DateTimeFormat
    const fullLocale = locale === "pt" ? "pt-BR" : "en-US";

    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      return dateTimeString; // Return as-is if invalid
    }
    return new Intl.DateTimeFormat(fullLocale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateTimeString;
  }
}

/**
 * Format a field value based on its type
 */
export function formatFieldValue(
  value: any,
  fieldType: "string" | "date" | "datetime" | "reference",
  locale: string = "en"
): string {
  if (value === null || value === undefined) {
    return "";
  }

  switch (fieldType) {
    case "date":
      return formatDate(value, locale);
    case "datetime":
      return formatDateTime(value, locale);
    case "string":
    case "reference":
    default:
      return String(value);
  }
}

/**
 * Truncate a string with ellipsis if it exceeds maxLength
 */
export function truncateString(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + "...";
}
