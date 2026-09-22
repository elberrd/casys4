export const REPORT_LINE_HEIGHTS = ["1", "1.15", "1.5", "1.75", "2"] as const;

export type ReportLineHeightValue = (typeof REPORT_LINE_HEIGHTS)[number];

export const REPORT_LINE_HEIGHT_SINGLE: ReportLineHeightValue = "1";

const LINE_HEIGHT_ALIASES: Record<string, ReportLineHeightValue> = {
  "1": "1",
  "1.0": "1",
  "1.00": "1",
  "100%": "1",
  "1.15": "1.15",
  "1.5": "1.5",
  "1.50": "1.5",
  "1.75": "1.75",
  "2": "2",
  "2.0": "2",
  "2.00": "2",
};

export function isReportLineHeightValue(
  value: string,
): value is ReportLineHeightValue {
  return (REPORT_LINE_HEIGHTS as readonly string[]).includes(value);
}

/** Maps editor/CSS line-height strings onto the toolbar options. */
export function normalizeReportLineHeight(
  value: string | null | undefined,
): ReportLineHeightValue | "" {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "normal") return "";
  return LINE_HEIGHT_ALIASES[trimmed] ?? "";
}
