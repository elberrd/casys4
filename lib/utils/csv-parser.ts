/**
 * CSV Parser Utility
 *
 * Parses CSV files with people data for bulk import
 * Validates CSV structure and data types
 * Returns parsed data with validation errors
 */

export interface ParsedCSVRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

export interface ParsedCSVResult {
  headers: string[];
  rows: ParsedCSVRow[];
  validRows: ParsedCSVRow[];
  invalidRows: ParsedCSVRow[];
  isValid: boolean;
  totalRows: number;
  validCount: number;
  invalidCount: number;
}

/**
 * Expected CSV headers for people import
 */
export const PEOPLE_CSV_HEADERS = [
  'fullName',
  'email',
  'cpf',
  'birthDate',
  'nationality',
  'gender',
  'maritalStatus',
  'phone',
  'currentCity',
  'currentState',
  'currentCountry',
] as const;

export type PeopleCSVHeader = typeof PEOPLE_CSV_HEADERS[number];

/**
 * Generate a CSV template with headers and example row
 */
export function generatePeopleCSVTemplate(): string {
  const headers = PEOPLE_CSV_HEADERS.join(',');
  const example = [
    'John Doe',
    'john.doe@example.com',
    '123.456.789-00',
    '1990-01-15',
    'Brazilian',
    'Male',
    'Single',
    '+55 11 98765-4321',
    'São Paulo',
    'SP',
    'Brazil',
  ].join(',');

  return `${headers}\n${example}`;
}

/**
 * Parse CSV text into structured data
 */
export function parseCSV(csvText: string): ParsedCSVResult {
  const lines = csvText.trim().split('\n');

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      validRows: [],
      invalidRows: [],
      isValid: false,
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
    };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);

  // Validate headers
  const headerErrors = validateHeaders(headers);

  // Parse data rows
  const rows: ParsedCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);
    const rowData: Record<string, string> = {};

    // Map values to headers
    headers.forEach((header, index) => {
      rowData[header] = values[index] || '';
    });

    // Validate row data
    const rowErrors = [...headerErrors, ...validatePeopleRow(rowData, i + 1)];

    rows.push({
      rowNumber: i + 1,
      data: rowData,
      errors: rowErrors,
    });
  }

  // Separate valid and invalid rows
  const validRows = rows.filter(row => row.errors.length === 0);
  const invalidRows = rows.filter(row => row.errors.length > 0);

  return {
    headers,
    rows,
    validRows,
    invalidRows,
    isValid: invalidRows.length === 0 && validRows.length > 0,
    totalRows: rows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
  };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push the last value
  result.push(current.trim());

  return result;
}

/**
 * Validate CSV headers against expected headers
 */
function validateHeaders(headers: string[]): string[] {
  const errors: string[] = [];

  if (headers.length === 0) {
    errors.push('CSV file is empty');
    return errors;
  }

  // Check for required headers
  const missingHeaders = PEOPLE_CSV_HEADERS.filter(
    required => !headers.includes(required)
  );

  if (missingHeaders.length > 0) {
    errors.push(
      `Missing required columns: ${missingHeaders.join(', ')}`
    );
  }

  // Check for extra headers
  const extraHeaders = headers.filter(
    header => !PEOPLE_CSV_HEADERS.includes(header as PeopleCSVHeader)
  );

  if (extraHeaders.length > 0) {
    errors.push(
      `Unknown columns (will be ignored): ${extraHeaders.join(', ')}`
    );
  }

  return errors;
}

/**
 * Validate a single person row
 */
function validatePeopleRow(
  data: Record<string, string>,
  rowNumber: number
): string[] {
  const errors: string[] = [];

  // Required fields
  if (!data.fullName || data.fullName.trim().length === 0) {
    errors.push(`Row ${rowNumber}: fullName is required`);
  }

  if (!data.email || data.email.trim().length === 0) {
    errors.push(`Row ${rowNumber}: email is required`);
  } else if (!isValidEmail(data.email)) {
    errors.push(`Row ${rowNumber}: email is not valid`);
  }

  if (!data.cpf || data.cpf.trim().length === 0) {
    errors.push(`Row ${rowNumber}: cpf is required`);
  } else if (!isValidCPF(data.cpf)) {
    errors.push(`Row ${rowNumber}: cpf format is invalid (use XXX.XXX.XXX-XX or 11 digits)`);
  }

  if (!data.birthDate || data.birthDate.trim().length === 0) {
    errors.push(`Row ${rowNumber}: birthDate is required`);
  } else if (!isValidDate(data.birthDate)) {
    errors.push(`Row ${rowNumber}: birthDate must be in YYYY-MM-DD format`);
  }

  if (!data.nationality || data.nationality.trim().length === 0) {
    errors.push(`Row ${rowNumber}: nationality is required`);
  }

  // Optional fields validation
  if (data.gender && !['Male', 'Female', 'Other'].includes(data.gender)) {
    errors.push(`Row ${rowNumber}: gender must be Male, Female, or Other`);
  }

  if (data.maritalStatus && !['Single', 'Married', 'Divorced', 'Widowed', 'Other'].includes(data.maritalStatus)) {
    errors.push(`Row ${rowNumber}: maritalStatus must be Single, Married, Divorced, Widowed, or Other`);
  }

  if (data.phone && data.phone.length > 0 && !isValidPhone(data.phone)) {
    errors.push(`Row ${rowNumber}: phone format is invalid`);
  }

  return errors;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate CPF format (Brazilian tax ID)
 */
function isValidCPF(cpf: string): boolean {
  // Remove common separators
  const cleaned = cpf.replace(/[.\-\s]/g, '');

  // Must be 11 digits
  if (cleaned.length !== 11) {
    return false;
  }

  // Must be all digits
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  // Reject known invalid CPFs (all same digit)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  return true;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate phone format (allows various international formats)
 */
function isValidPhone(phone: string): boolean {
  // Allow various phone formats with optional country code, spaces, hyphens, parentheses
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/;
  return phoneRegex.test(phone);
}

/**
 * Convert CSV row data to person object for Convex
 */
export function csvRowToPersonData(rowData: Record<string, string>) {
  return {
    fullName: rowData.fullName.trim(),
    email: rowData.email.trim().toLowerCase(),
    cpf: rowData.cpf.replace(/[.\-\s]/g, ''), // Clean CPF format
    birthDate: rowData.birthDate.trim(),
    nationality: rowData.nationality.trim(),
    gender: rowData.gender?.trim() || undefined,
    maritalStatus: rowData.maritalStatus?.trim() || undefined,
    phone: rowData.phone?.trim() || undefined,
    currentCity: rowData.currentCity?.trim() || undefined,
    currentState: rowData.currentState?.trim() || undefined,
    currentCountry: rowData.currentCountry?.trim() || undefined,
  };
}

/**
 * Export functions for generating downloadable CSV template
 */
export function downloadCSVTemplate() {
  const template = generatePeopleCSVTemplate();
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'people_import_template.csv';
  link.click();

  URL.revokeObjectURL(url);
}
