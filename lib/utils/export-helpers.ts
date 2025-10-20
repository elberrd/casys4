/**
 * Export Helpers
 *
 * Utilities for converting query results to CSV format
 * Handles proper formatting, escaping, and UTF-8 encoding
 */

/**
 * Escape a value for CSV format
 * Handles quotes, commas, newlines, and special characters
 */
export function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  // Convert to string
  let str = String(value);

  // If the value contains quotes, commas, or newlines, wrap in quotes and escape quotes
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    // Escape quotes by doubling them
    str = str.replace(/"/g, '""');
    // Wrap in quotes
    return `"${str}"`;
  }

  return str;
}

/**
 * Convert an array of objects to CSV string
 */
export function objectsToCSV<T extends Record<string, any>>(
  data: T[],
  headers?: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) {
    return "";
  }

  // Use provided headers or infer from first object
  const csvHeaders =
    headers ||
    Object.keys(data[0]).map((key) => ({
      key: key as keyof T,
      label: key,
    }));

  // Build header row
  const headerRow = csvHeaders.map((h) => escapeCSVValue(h.label)).join(",");

  // Build data rows
  const dataRows = data.map((row) => {
    return csvHeaders
      .map((header) => {
        const value = row[header.key];
        return escapeCSVValue(value);
      })
      .join(",");
  });

  // Combine header and data rows
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Format a date for CSV export
 * Converts ISO date strings to readable format
 */
export function formatDateForCSV(dateStr: string | number | undefined): string {
  if (!dateStr) {
    return "";
  }

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return "";
    }

    // Format as YYYY-MM-DD for date-only strings
    if (typeof dateStr === "string" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    // Format as YYYY-MM-DD HH:MM:SS for timestamps
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return "";
  }
}

/**
 * Flatten nested objects for CSV export
 * Converts nested structures like {person: {name: "John"}} to {person_name: "John"}
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix: string = "",
  separator: string = "_"
): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (value === null || value === undefined) {
      flattened[newKey] = "";
    } else if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenObject(value, newKey, separator));
    } else if (Array.isArray(value)) {
      // Convert arrays to comma-separated strings
      flattened[newKey] = value.join(", ");
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}

/**
 * Create a downloadable CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename with timestamp
 */
export function generateExportFilename(
  prefix: string,
  extension: string = "csv"
): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Format file size for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Estimate CSV file size
 * Rough approximation based on character count
 */
export function estimateCSVSize(csvContent: string): number {
  // UTF-8 encoding: most ASCII chars are 1 byte
  // Add some overhead for special characters
  return csvContent.length * 1.2;
}

/**
 * Split large datasets into chunks for export
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Validate CSV export configuration
 */
export interface ExportConfig {
  filename: string;
  includeHeaders: boolean;
  maxRows?: number;
  selectedColumns?: string[];
}

export function validateExportConfig(config: ExportConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.filename || config.filename.trim() === "") {
    errors.push("Filename is required");
  }

  if (config.maxRows !== undefined && config.maxRows <= 0) {
    errors.push("Max rows must be a positive number");
  }

  if (
    config.selectedColumns !== undefined &&
    config.selectedColumns.length === 0
  ) {
    errors.push("At least one column must be selected");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create CSV headers with internationalization support
 */
export interface ColumnHeader {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export function createCSVHeaders(
  columns: ColumnHeader[],
  translate?: (key: string) => string
): { key: string; label: string }[] {
  return columns.map((col) => ({
    key: col.key,
    label: translate ? translate(col.label) : col.label,
  }));
}

/**
 * Format row data according to column definitions
 */
export function formatRowData<T extends Record<string, any>>(
  row: T,
  columns: ColumnHeader[]
): Record<string, any> {
  const formatted: Record<string, any> = {};

  for (const column of columns) {
    const value = row[column.key];
    formatted[column.key] = column.format ? column.format(value) : value;
  }

  return formatted;
}

/**
 * Sanitize data for CSV export
 * Removes sensitive information and formats for display
 */
export function sanitizeForExport<T extends Record<string, any>>(
  data: T[],
  excludeFields: string[] = []
): T[] {
  return data.map((row) => {
    const sanitized = { ...row };

    // Remove excluded fields
    for (const field of excludeFields) {
      delete sanitized[field];
    }

    // Remove internal IDs that start with underscore
    for (const key of Object.keys(sanitized)) {
      if (key.startsWith("_") && key !== "_id") {
        delete sanitized[key];
      }
    }

    return sanitized;
  });
}
