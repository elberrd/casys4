/**
 * Calculates the relative time difference between a given date and today
 * Returns the difference in years, months, and days
 */
export function getRelativeDate(dateString: string): {
  years: number;
  months: number;
  days: number;
  totalDays: number;
} | null {
  if (!dateString) return null;

  try {
    // Parse the ISO date string (YYYY-MM-DD)
    const parts = dateString.split("-");
    if (parts.length !== 3) return null;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    const startDate = new Date(year, month, day);
    const today = new Date();

    // Reset time to midnight for accurate day calculation
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // If date is in the future, return null
    if (startDate > today) return null;

    // Calculate total days difference
    const totalDays = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate years, months, and days
    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();
    let days = today.getDate() - startDate.getDate();

    // Adjust for negative days
    if (days < 0) {
      months--;
      // Get days in previous month
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    return {
      years,
      months,
      days,
      totalDays,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Formats the relative date into a human-readable string
 * Example: "2 anos, 3 meses, 5 dias"
 */
export function formatRelativeDate(
  dateString: string,
  labels: {
    year: string;
    years: string;
    month: string;
    months: string;
    day: string;
    days: string;
  }
): string | null {
  const relative = getRelativeDate(dateString);
  if (!relative) return null;

  const parts: string[] = [];

  if (relative.years > 0) {
    parts.push(
      `${relative.years} ${relative.years === 1 ? labels.year : labels.years}`
    );
  }

  if (relative.months > 0) {
    parts.push(
      `${relative.months} ${relative.months === 1 ? labels.month : labels.months}`
    );
  }

  if (relative.days > 0) {
    parts.push(
      `${relative.days} ${relative.days === 1 ? labels.day : labels.days}`
    );
  }

  // If all values are 0, show "0 days"
  if (parts.length === 0) {
    parts.push(`0 ${labels.days}`);
  }

  return parts.join(", ");
}
