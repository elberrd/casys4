import { BRAZIL_COUNTRY_CODE } from "@/lib/data/brazil-states";
import type { BrazilianCepAddress } from "@/lib/utils/viacep";

export type CandidateAddressValue = {
  addressIsBrazil?: boolean;
  addressStreet?: string;
  addressComplement?: string;
  addressCountryCode?: string;
  addressCountryName?: string;
  addressStateCode?: string;
  addressStateName?: string;
  addressCity?: string;
  addressPostalCode?: string;
  /** @deprecated Free-text address kept for records already filled. */
  residenceAddressAbroad?: string;
};

export const EMPTY_CANDIDATE_ADDRESS_FORM = {
  addressIsBrazil: false as boolean,
  addressStreet: "",
  addressComplement: "",
  addressCountryCode: "",
  addressCountryName: "",
  addressStateCode: "",
  addressStateName: "",
  addressCity: "",
  addressPostalCode: "",
};

export function isBrazilAddressSelected(
  value: CandidateAddressValue,
): boolean {
  return value.addressIsBrazil === true;
}

export function applyBrazilCheckbox(args: {
  checked: boolean;
  value: CandidateAddressValue;
  brazilCountryName: string;
}): CandidateAddressValue {
  if (args.checked) {
    return {
      ...args.value,
      addressIsBrazil: true,
      addressCountryCode: BRAZIL_COUNTRY_CODE,
      addressCountryName: args.brazilCountryName,
    };
  }

  return {
    ...args.value,
    addressIsBrazil: false,
  };
}

export function applyCepLookupResult(args: {
  value: CandidateAddressValue;
  lookup: BrazilianCepAddress;
  brazilCountryName: string;
}): CandidateAddressValue {
  const complement =
    args.lookup.complement || args.value.addressComplement || "";

  return {
    ...args.value,
    addressIsBrazil: true,
    addressCountryCode: BRAZIL_COUNTRY_CODE,
    addressCountryName: args.brazilCountryName,
    addressStreet: args.lookup.street || args.value.addressStreet || "",
    addressComplement: complement,
    addressStateCode: args.lookup.stateCode,
    addressStateName: args.lookup.stateName,
    addressCity: args.lookup.city,
    addressPostalCode: args.lookup.postalCode || args.value.addressPostalCode,
  };
}

export function formatCandidateAddress(
  value: CandidateAddressValue,
): string {
  const line1 = [value.addressStreet, value.addressComplement]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const stateLabel = value.addressStateName || value.addressStateCode;
  const locality = [value.addressCity, stateLabel]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" - ");

  const postal = value.addressPostalCode?.trim();
  const country = value.addressCountryName?.trim();

  return [line1, locality, postal, country].filter(Boolean).join(", ");
}
