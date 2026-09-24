import { BRAZIL_COUNTRY_CODE } from "../data/brazil-states";

export const REPORTED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export type AddressOwnerType = "person" | "process";

export type StructuredAddressFields = {
  addressIsBrazil?: boolean;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCountryCode?: string;
  addressCountryName?: string;
  addressStateCode?: string;
  addressStateName?: string;
  addressCity?: string;
  addressPostalCode?: string;
};

export const SUBSTANTIVE_ADDRESS_KEYS = [
  "addressStreet",
  "addressNumber",
  "addressComplement",
  "addressNeighborhood",
  "addressStateCode",
  "addressStateName",
  "addressCity",
  "addressPostalCode",
] as const;

const ALL_STRING_ADDRESS_KEYS = [
  ...SUBSTANTIVE_ADDRESS_KEYS,
  "addressCountryCode",
  "addressCountryName",
] as const;

export function trimOptional(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeCountryCode(
  value: string | undefined | null,
): string | undefined {
  const trimmed = trimOptional(value);
  return trimmed ? trimmed.toUpperCase() : undefined;
}

/** True when addressCountryCode is BR or addressIsBrazil is true. */
export function isBrazilAddress(
  source: Partial<StructuredAddressFields> | null | undefined,
): boolean {
  if (!source) return false;
  if (source.addressIsBrazil === true) return true;
  return normalizeCountryCode(source.addressCountryCode) === BRAZIL_COUNTRY_CODE;
}

export function hasSubstantiveAddressFields(
  source: Partial<StructuredAddressFields> | null | undefined,
): boolean {
  if (!source) return false;
  return SUBSTANTIVE_ADDRESS_KEYS.some((key) =>
    Boolean(trimOptional(source[key])),
  );
}

/**
 * Old person/process forms defaulted the "endereço no Brasil" checkbox.
 * Flag-only rows have BR country/flag and no street, city, postal code, etc.
 */
export function isBrazilFlagOnly(
  source: Partial<StructuredAddressFields> | null | undefined,
): boolean {
  return isBrazilAddress(source) && !hasSubstantiveAddressFields(source);
}

export function pickStructuredAddressFields(
  source: Partial<StructuredAddressFields> | null | undefined,
): StructuredAddressFields {
  const result: StructuredAddressFields = {};
  if (!source) return result;

  if (typeof source.addressIsBrazil === "boolean") {
    result.addressIsBrazil = source.addressIsBrazil;
  }

  for (const key of ALL_STRING_ADDRESS_KEYS) {
    const trimmed = trimOptional(source[key]);
    if (trimmed) {
      result[key] = trimmed;
    }
  }

  return result;
}

export function hasStructuredAddressContent(
  source: Partial<StructuredAddressFields> | null | undefined,
): boolean {
  const fields = pickStructuredAddressFields(source);
  return ALL_STRING_ADDRESS_KEYS.some((key) => Boolean(fields[key]));
}

export function forceBrazilAddressFields(
  source: Partial<StructuredAddressFields>,
  brazilCountryName = "Brasil",
): StructuredAddressFields {
  const fields = pickStructuredAddressFields(source);
  return {
    ...fields,
    addressIsBrazil: true,
    addressCountryCode: BRAZIL_COUNTRY_CODE,
    addressCountryName:
      trimOptional(fields.addressCountryName) || brazilCountryName,
  };
}

export function isValidReportedAt(value: string | undefined | null): boolean {
  if (!value || !REPORTED_AT_PATTERN.test(value)) return false;
  const parsed = Date.parse(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(parsed)) return false;
  return new Date(parsed).toISOString().slice(0, 10) === value;
}

export function timestampToIsoDate(
  timestamp: number,
  timeZone = SAO_PAULO_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export function todayIsoDate(now = Date.now()): string {
  return timestampToIsoDate(now);
}

export function reportedAtFromCreatedAt(
  createdAt: number | undefined,
  creationTime: number,
): string {
  return timestampToIsoDate(createdAt ?? creationTime);
}

export function formatAddressAsText(
  source: Partial<StructuredAddressFields> | null | undefined,
): string {
  const fields = pickStructuredAddressFields(source);
  const streetAndNumber = [fields.addressStreet, fields.addressNumber]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const line1 = [streetAndNumber, fields.addressComplement]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const neighborhood = fields.addressNeighborhood?.trim() || "";
  const stateLabel = fields.addressStateName || fields.addressStateCode;
  const cityState = [fields.addressCity, stateLabel]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" - ");

  const postal = fields.addressPostalCode?.trim();
  const country = fields.addressCountryName?.trim();
  const countryCode = fields.addressCountryCode?.trim();
  const countryPart = [country, countryCode && countryCode !== country ? countryCode : ""]
    .filter(Boolean)
    .join(" ");

  const formatted = [line1, neighborhood, cityState, postal, countryPart]
    .filter(Boolean)
    .join(", ");

  const extras: string[] = [];
  if (typeof fields.addressIsBrazil === "boolean") {
    extras.push(`addressIsBrazil=${fields.addressIsBrazil ? "true" : "false"}`);
  }
  if (countryCode && !formatted.includes(countryCode)) {
    extras.push(`addressCountryCode=${countryCode}`);
  }

  return [formatted, extras.join("; ")].filter(Boolean).join(" | ");
}

export function personAddressRejectsBrazil(
  source: Partial<StructuredAddressFields> | null | undefined,
): boolean {
  return isBrazilAddress(source);
}

export function processAddressRejectsNonBrazil(
  source: Partial<StructuredAddressFields> | null | undefined,
): boolean {
  if (!source) return false;
  if (!hasSubstantiveAddressFields(source) && !hasStructuredAddressContent(source)) {
    return false;
  }
  return !isBrazilAddress(source);
}

/** people.update replace: keep the stored blob, ignore incoming address. */
export function legacyPersonAddressForReplace(current: {
  address?: string;
}): { address: string } | Record<string, never> {
  return current.address ? { address: current.address } : {};
}
