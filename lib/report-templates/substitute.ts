import { isReportVariableKey, type ReportVariableKey } from "./variables";

const ALLOWED_CHIP_STYLE_PROPERTIES = new Set([
  "background",
  "background-color",
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "letter-spacing",
  "line-height",
  "text-decoration",
  "text-decoration-line",
]);

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

function readAttribute(tag: string, name: string): string {
  const pattern = new RegExp(`\\s${name}=["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1] ?? "";
}

function sanitizeChipStyle(style: string): string {
  return style
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const separator = part.indexOf(":");
      if (separator <= 0) return [];
      const property = part.slice(0, separator).trim().toLowerCase();
      const value = part.slice(separator + 1).trim();
      if (!ALLOWED_CHIP_STYLE_PROPERTIES.has(property)) return [];
      if (/url\s*\(|expression|javascript:|@import/i.test(value)) return [];
      return [`${property}: ${value}`];
    })
    .join("; ");
}

function isTrueAttribute(tag: string, name: string): boolean {
  return readAttribute(tag, name).toLowerCase() === "true";
}

function wrapWithChipFormat(html: string, tag: string): string {
  let result = html;
  if (isTrueAttribute(tag, "data-strike")) result = `<s>${result}</s>`;
  if (isTrueAttribute(tag, "data-underline")) result = `<u>${result}</u>`;
  if (isTrueAttribute(tag, "data-italic")) result = `<em>${result}</em>`;
  if (isTrueAttribute(tag, "data-bold")) result = `<strong>${result}</strong>`;
  return result;
}

function formattedSubstitutedValue(
  match: string,
  values: Partial<Record<ReportVariableKey, string>>,
): string {
  const key = readAttribute(match, "data-key");
  const value = lookupValue(values, key);
  if (value === "") return "";

  const escaped = escapeHtml(value).replace(/\n/g, "<br />");
  const formatted = wrapWithChipFormat(escaped, match);
  const style = sanitizeChipStyle(readAttribute(match, "style"));
  if (!style) return formatted;
  return `<span style="${escapeHtml(style)}">${formatted}</span>`;
}

/**
 * Replaces TipTap variable chips and `{{key}}` tokens with process values.
 * Values are HTML-escaped so they can be injected into stored template HTML.
 * Chip data-bold / data-italic (and wrapping <strong>/<em>) stay on the filled text.
 */
export function substituteReportVariables(
  html: string,
  values: Partial<Record<ReportVariableKey, string>>,
): string {
  if (!html) return "";

  const withNodes = html.replace(
    /<span\b[^>]*data-type="report-variable"[^>]*>[\s\S]*?<\/span>/gi,
    (match) => formattedSubstitutedValue(match, values),
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
