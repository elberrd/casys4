import { isReportVariableKey, type ReportVariableKey } from "./variables";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lookupValue(
  values: Partial<Record<ReportVariableKey, string>>,
  rawKey: string,
): string {
  const key = rawKey.trim();
  if (isReportVariableKey(key)) {
    return values[key] ?? "";
  }
  return "";
}

/**
 * Replaces TipTap variable chips and `{{key}}` tokens with process values.
 * Values are HTML-escaped so they can be injected into stored template HTML.
 */
export function substituteReportVariables(
  html: string,
  values: Partial<Record<ReportVariableKey, string>>,
): string {
  if (!html) return "";

  const withNodes = html.replace(
    /<span\b[^>]*data-type="report-variable"[^>]*>[\s\S]*?<\/span>/gi,
    (match) => {
      const keyMatch = match.match(/data-key="([^"]*)"/i);
      const key = keyMatch?.[1] ?? "";
      const value = lookupValue(values, key);
      return value === "" ? "" : escapeHtml(value).replace(/\n/g, "<br />");
    },
  );

  return withNodes.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_full, rawKey: string) => {
    const value = lookupValue(values, rawKey);
    return value === "" ? "" : escapeHtml(value).replace(/\n/g, "<br />");
  });
}

export function extractReportVariableKeys(html: string): ReportVariableKey[] {
  if (!html) return [];

  const keys = new Set<ReportVariableKey>();
  const chipRegex = /data-key="([^"]*)"/gi;
  let chipMatch = chipRegex.exec(html);
  while (chipMatch) {
    const key = chipMatch[1]?.trim() ?? "";
    if (isReportVariableKey(key)) {
      keys.add(key);
    }
    chipMatch = chipRegex.exec(html);
  }

  const tokenRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
  let tokenMatch = tokenRegex.exec(html);
  while (tokenMatch) {
    const key = tokenMatch[1]?.trim() ?? "";
    if (isReportVariableKey(key)) {
      keys.add(key);
    }
    tokenMatch = tokenRegex.exec(html);
  }

  return [...keys];
}
