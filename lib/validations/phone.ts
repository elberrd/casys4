import { z } from "zod";

/**
 * Phone Number Validation Utilities
 *
 * Provides reusable Zod schemas for validating phone numbers with international format.
 * Compatible with the PhoneInput component which stores numbers in the format: "+[dialCode] [number]"
 *
 * Examples of valid formats:
 * - "+55 11 98765-4321" (Brazil)
 * - "+1 (555) 123-4567" (US/Canada)
 * - "+44 20 7946 0958" (UK)
 * - "+86 138 0013 8000" (China)
 */

/**
 * Phone number regex pattern
 * Matches international phone numbers starting with + followed by country code and number
 * Allows spaces, hyphens, parentheses, and dots as formatting characters
 */
const phoneRegex = /^\+\d{1,4}[\s\-\(\)\.]*[\d\s\-\(\)\.]{6,20}$/;

/**
 * Validates that a phone number:
 * 1. Starts with + followed by country code (1-4 digits)
 * 2. Contains 6-20 digits for the phone number
 * 3. Allows common formatting characters (spaces, hyphens, parentheses, dots)
 */
export const phoneNumberSchema = z
  .string()
  .regex(phoneRegex, "Invalid international phone number format. Must start with country code (e.g., +55)")
  .min(8, "Phone number is too short")
  .max(30, "Phone number is too long");

/**
 * Optional phone number validation
 * Accepts empty string or valid phone number
 */
export const optionalPhoneNumberSchema = phoneNumberSchema
  .optional()
  .or(z.literal(""));

/**
 * Helper function to clean phone number for validation
 * Removes all formatting but keeps the + prefix
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  // Keep the + prefix, remove all other non-digit characters
  const digits = phone.replace(/[^\d+]/g, "");
  return digits;
}

/**
 * Helper function to validate phone number length after cleaning
 * Returns true if the phone has between 7 and 25 digits (including country code)
 */
export function isValidPhoneLength(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  const digitCount = cleaned.replace(/\D/g, "").length;
  return digitCount >= 7 && digitCount <= 25;
}

/**
 * Strict phone number validation (for required fields)
 * Enforces that the phone number is provided and valid
 */
export const requiredPhoneNumberSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(phoneRegex, "Invalid international phone number format. Must start with country code (e.g., +55)")
  .refine(isValidPhoneLength, {
    message: "Phone number must have between 7 and 25 digits",
  });
