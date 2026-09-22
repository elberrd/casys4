export const REPORT_LINE_HEIGHTS = ["1", "1.15", "1.5", "1.75", "2"] as const;

export type ReportLineHeightValue = (typeof REPORT_LINE_HEIGHTS)[number];

export const REPORT_LINE_HEIGHT_SINGLE: ReportLineHeightValue = "1";

export const REPORT_LINE_HEIGHT_LABEL_KEYS = {
  "1": "lineHeightSingle",
  "1.15": "lineHeight115",
  "1.5": "lineHeight15",
  "1.75": "lineHeight175",
  "2": "lineHeightDouble",
} as const;

export type ReportLineHeightLabelKey =
  | (typeof REPORT_LINE_HEIGHT_LABEL_KEYS)[ReportLineHeightValue]
  | "lineHeightDefault";

/** Shared toolbar options for template editor AND process report modal. */
export const REPORT_LINE_HEIGHT_TOOLBAR_OPTIONS: ReadonlyArray<{
  value: ReportLineHeightValue | "";
  labelKey: ReportLineHeightLabelKey;
}> = [
  { value: REPORT_LINE_HEIGHT_SINGLE, labelKey: "lineHeightSingle" },
  { value: "1.15", labelKey: "lineHeight115" },
  { value: "1.5", labelKey: "lineHeight15" },
  { value: "1.75", labelKey: "lineHeight175" },
  { value: "2", labelKey: "lineHeightDouble" },
  { value: "", labelKey: "lineHeightDefault" },
];

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
