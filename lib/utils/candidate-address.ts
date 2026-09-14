import { BRAZIL_COUNTRY_CODE } from "@/lib/data/brazil-states";
import type { BrazilianCepAddress } from "@/lib/utils/viacep";

export type CandidateAddressValue = {
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
  /** @deprecated Free-text address kept for records already filled. */
  residenceAddressAbroad?: string;
};

export const EMPTY_CANDIDATE_ADDRESS_FORM = {
  addressIsBrazil: true as boolean,
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCountryCode: BRAZIL_COUNTRY_CODE,
  addressCountryName: "",
  addressStateCode: "",
  addressStateName: "",
  addressCity: "",
  addressPostalCode: "",
};

/** Unset means Brazil so CEP search is ready; the user can uncheck. */
export function isBrazilAddressSelected(
  value: CandidateAddressValue,
): boolean {
  if (value.addressIsBrazil === false) return false;
  if (value.addressIsBrazil === true) return true;
  if (
    value.addressCountryCode &&
    value.addressCountryCode !== BRAZIL_COUNTRY_CODE
  ) {
    return false;
  }
  return true;
}

export type PersonAddressFormSlice = {
  addressIsBrazil: boolean;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
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

export type StructuredAddressSource = {
  addressIsBrazil?: boolean | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCountryCode?: string | null;
  addressCountryName?: string | null;
  addressStateCode?: string | null;
  addressStateName?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
  address?: string | null;
};

export function personAddressFormFromRecord(
  source?: StructuredAddressSource | null,
): PersonAddressFormSlice {
  const addressIsBrazil = isBrazilAddressSelected({
    addressIsBrazil: source?.addressIsBrazil ?? undefined,
    addressCountryCode: source?.addressCountryCode ?? undefined,
  });
  return {
    addressIsBrazil,
    addressStreet: source?.addressStreet ?? "",
    addressNumber: source?.addressNumber ?? "",
    addressComplement: source?.addressComplement ?? "",
    addressNeighborhood: source?.addressNeighborhood ?? "",
    addressCountryCode:
      source?.addressCountryCode ||
      (addressIsBrazil ? BRAZIL_COUNTRY_CODE : ""),
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
    addressNumber: data.addressNumber,
    addressComplement: data.addressComplement,
    addressNeighborhood: data.addressNeighborhood,
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
    addressIsBrazil: isBrazilAddressSelected(next),
    addressStreet: next.addressStreet ?? "",
    addressNumber: next.addressNumber ?? "",
    addressComplement: next.addressComplement ?? "",
    addressNeighborhood: next.addressNeighborhood ?? "",
    addressCountryCode: next.addressCountryCode ?? "",
    addressCountryName: next.addressCountryName ?? "",
    addressStateCode: next.addressStateCode ?? "",
    addressStateName: next.addressStateName ?? "",
    addressCity: next.addressCity ?? "",
    addressPostalCode: next.addressPostalCode ?? "",
    address: next.residenceAddressAbroad ?? "",
  };
}

export function candidateAddressFromPerson(
  person?: StructuredAddressSource | null,
): CandidateAddressValue {
  return personAddressValueFromForm(personAddressFormFromRecord(person));
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
    addressNeighborhood:
      args.lookup.neighborhood || args.value.addressNeighborhood || "",
    addressStateCode: args.lookup.stateCode,
    addressStateName: args.lookup.stateName,
    addressCity: args.lookup.city,
    addressPostalCode: args.lookup.postalCode || args.value.addressPostalCode,
  };
}

export function hasStructuredAddressContent(
  value: CandidateAddressValue | StructuredAddressSource | null | undefined,
): boolean {
  if (!value) return false;
  return [
    value.addressStreet,
    value.addressNumber,
    value.addressComplement,
    value.addressNeighborhood,
    value.addressCity,
    value.addressPostalCode,
    value.addressCountryName,
    value.addressStateName,
  ].some((part) => typeof part === "string" && part.trim().length > 0);
}

export function formatCandidateAddress(
  value: CandidateAddressValue,
): string {
  const streetAndNumber = [value.addressStreet, value.addressNumber]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const line1 = [streetAndNumber, value.addressComplement]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const neighborhood = value.addressNeighborhood?.trim() || "";
  const stateLabel = value.addressStateName || value.addressStateCode;
  const cityState = [value.addressCity, stateLabel]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" - ");

  const postal = value.addressPostalCode?.trim();
  const country = value.addressCountryName?.trim();

  return [line1, neighborhood, cityState, postal, country]
    .filter(Boolean)
    .join(", ");
}
