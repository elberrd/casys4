/**
 * Pure helpers to compute and format how long someone has lived somewhere,
 * based on an ISO "since" date.
 *
 * Time is always read inside the functions (never at module scope) so the
 * results stay correct across re-renders and are not frozen at import time.
 */

/**
 * Computes the elapsed duration between `sinceDateISO` and the current time.
 *
 * @param sinceDateISO - An ISO date string (e.g. "2021-03-15" or full ISO).
 * @returns `{ years, months }` for the elapsed duration, or `null` when the
 *   input is missing, unparseable, or set in the future.
 */
export function getResidenceDuration(
  sinceDateISO: string,
): { years: number; months: number } | null {
  if (!sinceDateISO) {
    return null;
  }

  const since = new Date(sinceDateISO);
  if (Number.isNaN(since.getTime())) {
    return null;
  }

  // Read the current time inside the function (never at module top-level).
  const now = new Date();

  if (since.getTime() > now.getTime()) {
    return null;
  }

  let years = now.getFullYear() - since.getFullYear();
  let months = now.getMonth() - since.getMonth();

  // Borrow a month when the current day-of-month hasn't reached the start day.
  if (now.getDate() < since.getDate()) {
    months -= 1;
  }

  // Normalize negative months by borrowing from years.
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) {
    return null;
  }

  return { years, months };
}

/**
 * Formats the residence duration into a human-readable, locale-agnostic string
 * using the provided translation function.
 *
 * Expected i18n keys (the i18n agent provides them in messages/pt.json + en.json):
 * - `livesForYears` with `{ count }` -> e.g. "mora há 3 anos" / "lives for 3 years"
 * - `livesForMonths` with `{ count }` -> e.g. "mora há 2 meses" / "lives for 2 months"
 * - `livesForYearsAndMonths` with `{ years, months }` -> the combined sentence,
 *   e.g. "mora há 3 anos e 2 meses".
 *
 * @param sinceDateISO - An ISO date string.
 * @param t - The translation function (e.g. from `useTranslations`).
 * @returns A formatted string such as "mora há 3 anos e 2 meses", or an empty
 *   string when the duration cannot be computed.
 */
export function formatResidenceDuration(
  sinceDateISO: string,
  t: (key: string, vars?: Record<string, unknown>) => string,
): string {
  // Compute the current time inside the function via getResidenceDuration.
  const duration = getResidenceDuration(sinceDateISO);
  if (!duration) {
    return "";
  }

  const { years, months } = duration;

  if (years > 0 && months > 0) {
    return t("livesForYearsAndMonths", { years, months });
  }

  if (years > 0) {
    return t("livesForYears", { count: years });
  }

  // Covers both "only months" and "zero years / zero months" (less than a month).
  return t("livesForMonths", { count: months });
}
