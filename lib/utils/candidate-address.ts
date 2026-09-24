import { BRAZIL_COUNTRY_CODE } from "@/lib/data/brazil-states";
import {
  hasSubstantiveAddressFields,
  isBrazilAddress,
  isBrazilFlagOnly,
  todayIsoDate,
  type StructuredAddressFields,
} from "@/lib/utils/address-fields";
import type { BrazilianCepAddress } from "@/lib/utils/viacep";

export type AddressCountryMode = "person" | "process";

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
  reportedAt?: string;
  /** @deprecated Free-text address kept for records already filled. */
  residenceAddressAbroad?: string;
};

export const EMPTY_PROCESS_ADDRESS_FORM = {
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
  reportedAt: "",
};

/** @deprecated Use EMPTY_PROCESS_ADDRESS_FORM. Process addresses are always Brazil. */
export const EMPTY_CANDIDATE_ADDRESS_FORM = EMPTY_PROCESS_ADDRESS_FORM;

export const EMPTY_PERSON_ADDRESS_FORM = {
  addressIsBrazil: false as boolean,
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCountryCode: "",
  addressCountryName: "",
  addressStateCode: "",
  addressStateName: "",
  addressCity: "",
  addressPostalCode: "",
  reportedAt: "",
};

export function emptyAddressForm(
  mode: AddressCountryMode,
): typeof EMPTY_PERSON_ADDRESS_FORM {
  if (mode === "person") {
    return {
      ...EMPTY_PERSON_ADDRESS_FORM,
      reportedAt: todayIsoDate(),
    };
  }
  return {
    ...EMPTY_PROCESS_ADDRESS_FORM,
    reportedAt: todayIsoDate(),
  };
}

/** Process addresses: unset means Brazil. Person addresses: unset is not Brazil. */
export function isBrazilAddressSelected(
  value: CandidateAddressValue,
  mode: AddressCountryMode = "process",
): boolean {
  if (mode === "person") {
    return isBrazilAddress(value);
  }
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
  reportedAt: string;
};

export function emptyPersonAddressForm(): PersonAddressFormSlice {
  return {
    ...EMPTY_PERSON_ADDRESS_FORM,
    address: "",
    reportedAt: todayIsoDate(),
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
  reportedAt?: string | null;
};

function structuredFieldsFromSource(
  source: StructuredAddressSource,
): StructuredAddressFields {
  return {
    addressIsBrazil: source.addressIsBrazil ?? undefined,
    addressStreet: source.addressStreet ?? undefined,
    addressNumber: source.addressNumber ?? undefined,
    addressComplement: source.addressComplement ?? undefined,
    addressNeighborhood: source.addressNeighborhood ?? undefined,
    addressCountryCode: source.addressCountryCode ?? undefined,
    addressCountryName: source.addressCountryName ?? undefined,
    addressStateCode: source.addressStateCode ?? undefined,
    addressStateName: source.addressStateName ?? undefined,
    addressCity: source.addressCity ?? undefined,
    addressPostalCode: source.addressPostalCode ?? undefined,
  };
}

export function personAddressFormFromRecord(
  source?: StructuredAddressSource | null,
): PersonAddressFormSlice {
  const raw = {
    addressIsBrazil: source?.addressIsBrazil ?? undefined,
    addressCountryCode: source?.addressCountryCode ?? undefined,
  };
  const flagOnly = isBrazilFlagOnly({
    ...raw,
    addressStreet: source?.addressStreet ?? undefined,
    addressNumber: source?.addressNumber ?? undefined,
    addressComplement: source?.addressComplement ?? undefined,
    addressNeighborhood: source?.addressNeighborhood ?? undefined,
    addressStateCode: source?.addressStateCode ?? undefined,
    addressStateName: source?.addressStateName ?? undefined,
    addressCity: source?.addressCity ?? undefined,
    addressPostalCode: source?.addressPostalCode ?? undefined,
  });
  const brazilSelected = !flagOnly && isBrazilAddress(raw);
  const countryCode = flagOnly
    ? ""
    : source?.addressCountryCode || (brazilSelected ? BRAZIL_COUNTRY_CODE : "");

  return {
    addressIsBrazil: brazilSelected,
    addressStreet: source?.addressStreet ?? "",
    addressNumber: source?.addressNumber ?? "",
    addressComplement: source?.addressComplement ?? "",
    addressNeighborhood: source?.addressNeighborhood ?? "",
    addressCountryCode: countryCode,
    addressCountryName: flagOnly ? "" : (source?.addressCountryName ?? ""),
    addressStateCode: source?.addressStateCode ?? "",
    addressStateName: source?.addressStateName ?? "",
    addressCity: source?.addressCity ?? "",
    addressPostalCode: source?.addressPostalCode ?? "",
    address: source?.address ?? "",
    reportedAt: source?.reportedAt || todayIsoDate(),
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
    reportedAt: data.reportedAt,
    residenceAddressAbroad: data.address,
  };
}

export function personAddressFormFromValue(
  next: CandidateAddressValue,
): PersonAddressFormSlice {
  return {
    addressIsBrazil: isBrazilAddressSelected(next, "person"),
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
    reportedAt: next.reportedAt ?? todayIsoDate(),
  };
}

/**
 * Current person address for display and person forms.
 * Source of truth is the address table row (ownerType=person, isCurrent=true).
 * Never treat leftover embedded `people` fields as current: Brazil content
 * (including flag-only BR) yields empty so "Brasil" cannot appear as current.
 */
export function selectCurrentPersonAddress(
  tableCurrent?: StructuredAddressSource | null,
): CandidateAddressValue | null {
  if (!tableCurrent) return null;
  const fields = structuredFieldsFromSource(tableCurrent);
  if (isBrazilAddress(fields) || isBrazilFlagOnly(fields)) {
    return null;
  }
  if (!hasStructuredAddressContent(fields)) {
    return null;
  }
  return {
    addressIsBrazil: false,
    addressStreet: tableCurrent.addressStreet ?? "",
    addressNumber: tableCurrent.addressNumber ?? "",
    addressComplement: tableCurrent.addressComplement ?? "",
    addressNeighborhood: tableCurrent.addressNeighborhood ?? "",
    addressCountryCode: tableCurrent.addressCountryCode ?? "",
    addressCountryName: tableCurrent.addressCountryName ?? "",
    addressStateCode: tableCurrent.addressStateCode ?? "",
    addressStateName: tableCurrent.addressStateName ?? "",
    addressCity: tableCurrent.addressCity ?? "",
    addressPostalCode: tableCurrent.addressPostalCode ?? "",
    reportedAt: tableCurrent.reportedAt || undefined,
  };
}

export function formatCurrentPersonAddress(
  tableCurrent?: StructuredAddressSource | null,
): string {
  const selected = selectCurrentPersonAddress(tableCurrent);
  return selected ? formatCandidateAddress(selected) : "";
}

/**
 * Current process address for the process card. Source of truth is the
 * address table row (ownerType=process, isCurrent=true). Person rows and
 * leftover embedded process fields are not current: non-Brazil and
 * flag-only BR yield empty.
 */
export function selectCurrentProcessAddress(
  tableCurrent?: StructuredAddressSource | null,
): CandidateAddressValue | null {
  if (!tableCurrent) return null;
  const fields = structuredFieldsFromSource(tableCurrent);
  if (!isBrazilAddress(fields) || isBrazilFlagOnly(fields)) {
    return null;
  }
  if (!hasSubstantiveAddressFields(fields)) {
    return null;
  }
  return {
    addressIsBrazil: true,
    addressStreet: tableCurrent.addressStreet ?? "",
    addressNumber: tableCurrent.addressNumber ?? "",
    addressComplement: tableCurrent.addressComplement ?? "",
    addressNeighborhood: tableCurrent.addressNeighborhood ?? "",
    addressCountryCode: tableCurrent.addressCountryCode ?? "",
    addressCountryName: tableCurrent.addressCountryName ?? "",
    addressStateCode: tableCurrent.addressStateCode ?? "",
    addressStateName: tableCurrent.addressStateName ?? "",
    addressCity: tableCurrent.addressCity ?? "",
    addressPostalCode: tableCurrent.addressPostalCode ?? "",
    reportedAt: tableCurrent.reportedAt || undefined,
  };
}

export function formatCurrentProcessAddress(
  tableCurrent?: StructuredAddressSource | null,
): string {
  const selected = selectCurrentProcessAddress(tableCurrent);
  return selected ? formatCandidateAddress(selected) : "";
}

export function personStructuredFormFromTableCurrent(
  tableCurrent?: StructuredAddressSource | null,
): PersonAddressFormSlice {
  const selected = selectCurrentPersonAddress(tableCurrent);
  if (!selected) return emptyPersonAddressForm();
  return personAddressFormFromValue(selected);
}

export function isNonEmptyLegacyAddress(
  text: string | null | undefined,
): boolean {
  return typeof text === "string" && text.trim().length > 0;
}

/** Returns the original text when it should render; otherwise null. */
export function legacyAddressDisplayText(
  text: string | null | undefined,
): string | null {
  return isNonEmptyLegacyAddress(text) ? text! : null;
}

export function omitLegacyPersonAddressFromSubmit<T extends { address?: unknown }>(
  payload: T,
): Omit<T, "address"> {
  const { address, ...rest } = payload;
  void address;
  return rest;
}

export function omitLegacyProcessAddressFromSubmit<
  T extends { residenceAddressAbroad?: unknown },
>(payload: T): Omit<T, "residenceAddressAbroad"> {
  const { residenceAddressAbroad, ...rest } = payload;
  void residenceAddressAbroad;
  return rest;
}

/** people.update replace: keep the stored blob, ignore incoming address. */
export function legacyPersonAddressForReplace(current: {
  address?: string;
}): { address: string } | Record<string, never> {
  return current.address ? { address: current.address } : {};
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
