/**
 * Document Masks Utility Functions
 *
 * This module provides utilities for formatting, cleaning, and validating
 * Brazilian tax document numbers (CPF and CNPJ) and postal codes (CEP).
 *
 * CPF (Cadastro de Pessoas Físicas): Individual Tax ID - 11 digits
 * Format: 000.000.000-00
 *
 * CNPJ (Cadastro Nacional de Pessoas Jurídicas): Company Tax ID - 14 digits
 * Format: 00.000.000/0000-00
 *
 * CEP (Código de Endereçamento Postal): Postal Code - 8 digits
 * Format: 00000-000
 */

/**
 * Removes all non-numeric characters from a string
 *
 * @param value - The string to clean
 * @returns String containing only digits
 *
 * @example
 * cleanDocumentNumber("123.456.789-00") // "12345678900"
 * cleanDocumentNumber("12.345.678/0001-00") // "12345678000100"
 */
export function cleanDocumentNumber(value: string): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

/**
 * Formats a CPF string with standard Brazilian formatting
 *
 * @param value - The CPF string (can be formatted or unformatted)
 * @returns Formatted CPF string (000.000.000-00) or original value if invalid
 *
 * @example
 * formatCPF("12345678900") // "123.456.789-00"
 * formatCPF("123.456.789-00") // "123.456.789-00"
 * formatCPF("123") // "123" (incomplete, returns as-is)
 */
export function formatCPF(value: string): string {
  if (!value) return "";

  const cleaned = cleanDocumentNumber(value);

  // Return as-is if not enough digits
  if (cleaned.length < 11) return value;

  // Format: 000.000.000-00
  return cleaned
    .slice(0, 11)
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Formats a CNPJ string with standard Brazilian formatting
 *
 * @param value - The CNPJ string (can be formatted or unformatted)
 * @returns Formatted CNPJ string (00.000.000/0000-00) or original value if invalid
 *
 * @example
 * formatCNPJ("12345678000100") // "12.345.678/0001-00"
 * formatCNPJ("12.345.678/0001-00") // "12.345.678/0001-00"
 * formatCNPJ("123") // "123" (incomplete, returns as-is)
 */
export function formatCNPJ(value: string): string {
  if (!value) return "";

  const cleaned = cleanDocumentNumber(value);

  // Return as-is if not enough digits
  if (cleaned.length < 14) return value;

  // Format: 00.000.000/0000-00
  return cleaned
    .slice(0, 14)
    .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

/**
 * Returns the input mask pattern for CPF
 * Compatible with react-input-mask library
 *
 * @returns CPF mask pattern string
 */
export function getCPFMask(): string {
  return "999.999.999-99";
}

/**
 * Returns the input mask pattern for CNPJ
 * Compatible with react-input-mask library
 *
 * @returns CNPJ mask pattern string
 */
export function getCNPJMask(): string {
  return "99.999.999/9999-99";
}

/**
 * Validates a CPF using the Brazilian check digit algorithm
 *
 * The CPF check digit validation uses the modulo 11 algorithm:
 * - First check digit: calculated from first 9 digits
 * - Second check digit: calculated from first 10 digits (including first check digit)
 *
 * @param cpf - The CPF string (can be formatted or unformatted)
 * @returns true if CPF is valid, false otherwise
 *
 * @example
 * isValidCPF("123.456.789-09") // true (if valid)
 * isValidCPF("12345678909") // true (if valid)
 * isValidCPF("000.000.000-00") // false (all same digits)
 * isValidCPF("123") // false (incomplete)
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;

  const cleaned = cleanDocumentNumber(cpf);

  // CPF must have exactly 11 digits
  if (cleaned.length !== 11) return false;

  // Reject known invalid CPFs (all same digits)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let checkDigit1 = 11 - (sum % 11);
  if (checkDigit1 >= 10) checkDigit1 = 0;

  if (checkDigit1 !== parseInt(cleaned.charAt(9))) return false;

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  let checkDigit2 = 11 - (sum % 11);
  if (checkDigit2 >= 10) checkDigit2 = 0;

  if (checkDigit2 !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

/**
 * Validates a CNPJ using the Brazilian check digit algorithm
 *
 * The CNPJ check digit validation uses the modulo 11 algorithm:
 * - First check digit: calculated from first 12 digits
 * - Second check digit: calculated from first 13 digits (including first check digit)
 *
 * @param cnpj - The CNPJ string (can be formatted or unformatted)
 * @returns true if CNPJ is valid, false otherwise
 *
 * @example
 * isValidCNPJ("12.345.678/0001-95") // true (if valid)
 * isValidCNPJ("12345678000195") // true (if valid)
 * isValidCNPJ("00.000.000/0000-00") // false (all same digits)
 * isValidCNPJ("123") // false (incomplete)
 */
export function isValidCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;

  const cleaned = cleanDocumentNumber(cnpj);

  // CNPJ must have exactly 14 digits
  if (cleaned.length !== 14) return false;

  // Reject known invalid CNPJs (all same digits)
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  // Validate first check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let checkDigit1 = 11 - (sum % 11);
  if (checkDigit1 >= 10) checkDigit1 = 0;

  if (checkDigit1 !== parseInt(cleaned.charAt(12))) return false;

  // Validate second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  let checkDigit2 = 11 - (sum % 11);
  if (checkDigit2 >= 10) checkDigit2 = 0;

  if (checkDigit2 !== parseInt(cleaned.charAt(13))) return false;

  return true;
}

/**
 * Formats a CEP (Brazilian postal code) string with standard formatting
 *
 * @param value - The CEP string (can be formatted or unformatted)
 * @returns Formatted CEP string (00000-000) or original value if invalid
 *
 * @example
 * formatCEP("12345678") // "12345-678"
 * formatCEP("12345-678") // "12345-678"
 * formatCEP("123") // "123" (incomplete, returns as-is)
 */
export function formatCEP(value: string): string {
  if (!value) return "";

  const cleaned = cleanDocumentNumber(value);

  // Return as-is if not enough digits
  if (cleaned.length < 8) return value;

  // Format: 00000-000
  return cleaned
    .slice(0, 8)
    .replace(/(\d{5})(\d{3})/, "$1-$2");
}

/**
 * Returns the input mask pattern for CEP
 * Compatible with react-input-mask library
 *
 * @returns CEP mask pattern string
 */
export function getCEPMask(): string {
  return "99999-999";
}
