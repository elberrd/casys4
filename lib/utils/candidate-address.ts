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

export type PersonAddressFormSlice = {
  addressIsBrazil: boolean;
  addressStreet: string;
  addressComplement: string;
  addressCountryCode: string;
  addressCountryName: string;
  addressStateCode: string;
  addressStateName: string;
  addressCity: string;
  addressPostalCode: string;
  address: string;
};

export function emptyPersonAddressForm(): PersonAddressFormSlice {
  return {
    ...EMPTY_CANDIDATE_ADDRESS_FORM,
    address: "",
  };
}

export function personAddressFormFromRecord(source?: {
  addressIsBrazil?: boolean;
  addressStreet?: string | null;
  addressComplement?: string | null;
  addressCountryCode?: string | null;
  addressCountryName?: string | null;
  addressStateCode?: string | null;
  addressStateName?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
  address?: string | null;
} | null): PersonAddressFormSlice {
  return {
    addressIsBrazil: source?.addressIsBrazil === true,
    addressStreet: source?.addressStreet ?? "",
    addressComplement: source?.addressComplement ?? "",
    addressCountryCode: source?.addressCountryCode ?? "",
    addressCountryName: source?.addressCountryName ?? "",
    addressStateCode: source?.addressStateCode ?? "",
    addressStateName: source?.addressStateName ?? "",
    addressCity: source?.addressCity ?? "",
    addressPostalCode: source?.addressPostalCode ?? "",
    address: source?.address ?? "",
  };
}

export function personAddressValueFromForm(
  data: PersonAddressFormSlice,
): CandidateAddressValue {
  return {
    addressIsBrazil: data.addressIsBrazil,
    addressStreet: data.addressStreet,
    addressComplement: data.addressComplement,
    addressCountryCode: data.addressCountryCode,
    addressCountryName: data.addressCountryName,
    addressStateCode: data.addressStateCode,
    addressStateName: data.addressStateName,
    addressCity: data.addressCity,
    addressPostalCode: data.addressPostalCode,
    residenceAddressAbroad: data.address,
  };
}

export function personAddressFormFromValue(
  next: CandidateAddressValue,
): PersonAddressFormSlice {
  return {
    addressIsBrazil: next.addressIsBrazil === true,
    addressStreet: next.addressStreet ?? "",
    addressComplement: next.addressComplement ?? "",
    addressCountryCode: next.addressCountryCode ?? "",
    addressCountryName: next.addressCountryName ?? "",
    addressStateCode: next.addressStateCode ?? "",
    addressStateName: next.addressStateName ?? "",
    addressCity: next.addressCity ?? "",
    addressPostalCode: next.addressPostalCode ?? "",
    address: next.residenceAddressAbroad ?? "",
  };
}

export function candidateAddressFromPerson(person?: {
  addressIsBrazil?: boolean;
  addressStreet?: string | null;
  addressComplement?: string | null;
  addressCountryCode?: string | null;
  addressCountryName?: string | null;
  addressStateCode?: string | null;
  addressStateName?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
  address?: string | null;
} | null): CandidateAddressValue {
  return personAddressValueFromForm(personAddressFormFromRecord(person));
}

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
