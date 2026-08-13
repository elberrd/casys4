import { alpha3ToAlpha2 } from "i18n-iso-countries";

/** Returns the exact ISO code variants that may exist in the country table. */
export function getCountryCodeCandidates(value: string): string[] {
  const upper = value.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(upper)) return [];

  const alpha2 = upper.length === 3 ? alpha3ToAlpha2(upper) : undefined;
  return alpha2 && alpha2 !== upper ? [upper, alpha2] : [upper];
}

/** Distinguishes MRZ/ISO codes from country names for safe matching. */
export function isCountryCodeLike(value: string): boolean {
  return /^[A-Z]{2,3}$/.test(value.trim().toUpperCase());
}
