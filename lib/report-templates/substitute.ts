import { REPORT_PLACEHOLDER } from "@/lib/process-reports/types";
import {
  isOptionalReportVariableKey,
  resolveReportVariableKey,
  type ReportVariableKey,
} from "./variables";

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
  const key = resolveReportVariableKey(rawKey);
  if (!key) return "";
  return values[key] ?? "";
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

function styleIndicatesBold(style: string): boolean {
  return /font-weight\s*:\s*(bold|[6-9]00)/i.test(style);
}

function styleIndicatesItalic(style: string): boolean {
  return /font-style\s*:\s*italic/i.test(style);
}

function styleIndicatesUnderline(style: string): boolean {
  return /text-decoration(?:-line)?\s*:[^;]*underline/i.test(style);
}

function styleIndicatesStrike(style: string): boolean {
  return /text-decoration(?:-line)?\s*:[^;]*line-through/i.test(style);
}

export function chipMarkupHasFormat(
  tag: string,
  innerHtml: string,
  attr: "bold" | "italic" | "underline" | "strike",
): boolean {
  if (isTrueAttribute(tag, `data-${attr}`)) return true;
  const style = readAttribute(tag, "style");
  if (attr === "bold" && styleIndicatesBold(style)) return true;
  if (attr === "italic" && styleIndicatesItalic(style)) return true;
  if (attr === "underline" && styleIndicatesUnderline(style)) return true;
  if (attr === "strike" && styleIndicatesStrike(style)) return true;
  const inner = innerHtml.toLowerCase();
  if (attr === "bold") return /<(strong|b)\b/.test(inner);
  if (attr === "italic") return /<(em|i)\b/.test(inner);
  if (attr === "underline") return /<u\b/.test(inner);
  return /<(s|strike|del)\b/.test(inner);
}

function wrapWithChipFormat(
  html: string,
  tag: string,
  innerHtml: string,
): string {
  let result = html;
  if (chipMarkupHasFormat(tag, innerHtml, "strike")) result = `<s>${result}</s>`;
  if (chipMarkupHasFormat(tag, innerHtml, "underline")) {
    result = `<u>${result}</u>`;
  }
  if (chipMarkupHasFormat(tag, innerHtml, "italic")) {
    result = `<em>${result}</em>`;
  }
  if (chipMarkupHasFormat(tag, innerHtml, "bold")) {
    result = `<strong>${result}</strong>`;
  }
  return result;
}

function formattedSubstitutedValue(
  match: string,
  innerHtml: string,
  values: Partial<Record<ReportVariableKey, string>>,
): string {
  const key = readAttribute(match, "data-key");
  const value = lookupValue(values, key);
  if (value === "") return "";

  const escaped = escapeHtml(value).replace(/\n/g, "<br />");
  const formatted = wrapWithChipFormat(escaped, match, innerHtml);
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
    /<span\b([^>]*data-type="report-variable"[^>]*)>([\s\S]*?)<\/span>/gi,
    (_full, rawAttrs: string, innerHtml: string) =>
      formattedSubstitutedValue(`<span${rawAttrs}>`, innerHtml, values),
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
    const key = resolveReportVariableKey(chipMatch[1] ?? "");
    if (key) {
      keys.add(key);
    }
    chipMatch = chipRegex.exec(html);
  }

  const tokenRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
  let tokenMatch = tokenRegex.exec(html);
  while (tokenMatch) {
    const key = resolveReportVariableKey(tokenMatch[1] ?? "");
    if (key) {
      keys.add(key);
    }
    tokenMatch = tokenRegex.exec(html);
  }

  return [...keys];
}

function isEmptyReportValue(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" || trimmed === REPORT_PLACEHOLDER;
}

/** Variable keys present in the template whose filled value is blank. */
export function missingUsedReportVariables(
  html: string,
  values: Partial<Record<ReportVariableKey, string>>,
): ReportVariableKey[] {
  return extractReportVariableKeys(html).filter(
    (key) => !isOptionalReportVariableKey(key) && isEmptyReportValue(values[key]),
  );
}
