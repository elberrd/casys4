import assert from "node:assert/strict";
import test from "node:test";

import { getBrazilStateName } from "../lib/data/brazil-states";
import {
  applyBrazilCheckbox,
  applyCepLookupResult,
  EMPTY_CANDIDATE_ADDRESS_FORM,
  formatCandidateAddress,
  formatCurrentPersonAddress,
  formatCurrentProcessAddress,
  isBrazilAddressSelected,
  isNonEmptyLegacyAddress,
  legacyAddressDisplayText,
  legacyPersonAddressForReplace,
  omitLegacyPersonAddressFromSubmit,
  omitLegacyProcessAddressFromSubmit,
  personAddressFormFromRecord,
  personAddressFormFromValue,
  personAddressValueFromForm,
  personStructuredFormFromTableCurrent,
  selectCurrentPersonAddress,
  selectCurrentProcessAddress,
} from "../lib/utils/candidate-address";
import {
  isCompleteCep,
  parseBrasilApiCepResponse,
  parseViaCepResponse,
} from "../lib/utils/viacep";

test("maps Brazilian UF codes to official names", () => {
  assert.equal(getBrazilStateName("sp"), "São Paulo");
  assert.equal(getBrazilStateName("RJ"), "Rio de Janeiro");
});

test("treats an 8-digit CEP as complete", () => {
  assert.equal(isCompleteCep("01310-100"), true);
  assert.equal(isCompleteCep("01310100"), true);
  assert.equal(isCompleteCep("01310"), false);
});

test("parses a ViaCEP success payload", () => {
  const parsed = parseViaCepResponse({
    cep: "01310-100",
    logradouro: "Avenida Paulista",
    complemento: "de 1047 a 1865 - lado ímpar",
    bairro: "Bela Vista",
    localidade: "São Paulo",
    uf: "SP",
  });

  assert.deepEqual(parsed, {
    street: "Avenida Paulista",
    complement: "de 1047 a 1865 - lado ímpar",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    stateCode: "SP",
    stateName: "São Paulo",
    postalCode: "01310100",
  });
});

test("returns null when ViaCEP reports an unknown CEP", () => {
  assert.equal(parseViaCepResponse({ erro: true }), null);
  assert.equal(parseViaCepResponse({ erro: "true" }), null);
});

test("parses a BrasilAPI CEP payload", () => {
  const parsed = parseBrasilApiCepResponse({
    cep: "01310100",
    street: "Avenida Paulista",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  });

  assert.equal(parsed?.city, "São Paulo");
  assert.equal(parsed?.stateCode, "SP");
  assert.equal(parsed?.street, "Avenida Paulista");
  assert.equal(parsed?.neighborhood, "Bela Vista");
});

test("checking Brazil locks the country to BR", () => {
  const next = applyBrazilCheckbox({
    checked: true,
    value: { addressCountryCode: "US", addressCountryName: "United States" },
    brazilCountryName: "Brasil",
  });

  assert.equal(next.addressIsBrazil, true);
  assert.equal(next.addressCountryCode, "BR");
  assert.equal(next.addressCountryName, "Brasil");
});

test("unchecking Brazil keeps the current country so the user can change it", () => {
  const next = applyBrazilCheckbox({
    checked: false,
    value: {
      addressIsBrazil: true,
      addressCountryCode: "BR",
      addressCountryName: "Brasil",
    },
    brazilCountryName: "Brasil",
  });

  assert.equal(next.addressIsBrazil, false);
  assert.equal(next.addressCountryCode, "BR");
});

test("CEP lookup fills street, city, state and country", () => {
  const next = applyCepLookupResult({
    value: { addressComplement: "Apto 12" },
    lookup: {
      street: "Avenida Paulista",
      complement: "",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      stateCode: "SP",
      stateName: "São Paulo",
      postalCode: "01310100",
    },
    brazilCountryName: "Brasil",
  });

  assert.equal(next.addressStreet, "Avenida Paulista");
  assert.equal(next.addressCity, "São Paulo");
  assert.equal(next.addressStateCode, "SP");
  assert.equal(next.addressCountryCode, "BR");
  assert.equal(next.addressComplement, "Apto 12");
  assert.equal(next.addressNeighborhood, "Bela Vista");
  assert.equal(next.addressIsBrazil, true);
});

test("formats a structured candidate address for display", () => {
  const formatted = formatCandidateAddress({
    addressStreet: "Avenida Paulista",
    addressNumber: "1578",
    addressComplement: "Apto 12",
    addressNeighborhood: "Bela Vista",
    addressCity: "São Paulo",
    addressStateName: "São Paulo",
    addressPostalCode: "01310100",
    addressCountryName: "Brasil",
  });

  assert.equal(
    formatted,
    "Avenida Paulista, 1578, Apto 12, Bela Vista, São Paulo - São Paulo, 01310100, Brasil",
  );
});

test("empty process address form starts with Brazil so CEP search is ready", () => {
  assert.equal(EMPTY_CANDIDATE_ADDRESS_FORM.addressIsBrazil, true);
  assert.equal(EMPTY_CANDIDATE_ADDRESS_FORM.addressCountryCode, "BR");
  assert.equal(isBrazilAddressSelected({}), true);
  assert.equal(isBrazilAddressSelected({ addressIsBrazil: false }), false);
  assert.equal(
    isBrazilAddressSelected({ addressCountryCode: "US" }),
    false,
  );
});

test("person form treats missing record and flag-only BR as empty abroad", () => {
  assert.equal(personAddressFormFromRecord(null).addressIsBrazil, false);
  assert.equal(personAddressFormFromRecord(null).addressCountryCode, "");
  assert.equal(
    personAddressFormFromRecord({ addressIsBrazil: false }).addressIsBrazil,
    false,
  );
  const flagOnly = personAddressFormFromRecord({
    addressIsBrazil: true,
    addressCountryCode: "BR",
    addressCountryName: "Brasil",
  });
  assert.equal(flagOnly.addressIsBrazil, false);
  assert.equal(flagOnly.addressCountryCode, "");
  assert.equal(flagOnly.addressCountryName, "");
});

test("maps a person record onto the structured address form", () => {
  const next = personAddressFormFromRecord({
    addressIsBrazil: true,
    addressStreet: "Avenida Paulista",
    addressCity: "São Paulo",
    address: "old free text",
  });

  assert.equal(next.addressIsBrazil, true);
  assert.equal(next.addressStreet, "Avenida Paulista");
  assert.equal(next.address, "old free text");
  assert.equal(
    personAddressValueFromForm(next).residenceAddressAbroad,
    "old free text",
  );
});

test("personAddressFormFromValue never treats empty person form as Brazil", () => {
  const slice = personAddressFormFromValue({
    addressIsBrazil: false,
    addressCountryCode: "",
  });
  assert.equal(slice.addressIsBrazil, false);
});

test("selectCurrentPersonAddress returns the table current row and never embedded people fields", () => {
  const tableCurrent = {
    addressStreet: "123 Main Street",
    addressNumber: "Apt 4",
    addressCity: "New York",
    addressCountryCode: "US",
    addressCountryName: "United States",
    reportedAt: "2026-01-15",
  };
  const selected = selectCurrentPersonAddress(tableCurrent);
  assert.equal(selected?.addressStreet, "123 Main Street");
  assert.equal(selected?.addressCity, "New York");
  assert.equal(selected?.reportedAt, "2026-01-15");
  assert.equal(
    formatCurrentPersonAddress(tableCurrent),
    "123 Main Street, Apt 4, New York, United States",
  );

  assert.equal(selectCurrentPersonAddress(null), null);
  assert.equal(formatCurrentPersonAddress(null), "");
});

test("flag-only BR person and concatenated BR people fields yield empty current address", () => {
  assert.equal(
    selectCurrentPersonAddress({
      addressIsBrazil: true,
      addressCountryCode: "BR",
      addressCountryName: "Brasil",
    }),
    null,
  );
  const concatenatedPeopleFields = {
    addressIsBrazil: true,
    addressStreet: "Rua das Flores",
    addressNumber: "100",
    addressCity: "São Paulo",
    addressStateCode: "SP",
    addressPostalCode: "01001-000",
    addressCountryCode: "BR",
    address: "[casys4-addr-mig:person:id] Rua das Flores, 100",
  };
  assert.equal(selectCurrentPersonAddress(concatenatedPeopleFields), null);
  assert.equal(formatCurrentPersonAddress(concatenatedPeopleFields), "");
  const form = personStructuredFormFromTableCurrent(concatenatedPeopleFields);
  assert.equal(form.addressStreet, "");
  assert.equal(form.addressCity, "");
  assert.equal(form.addressCountryCode, "");
});

test("legacy address field renders only when the text is non-empty", () => {
  assert.equal(legacyAddressDisplayText(""), null);
  assert.equal(legacyAddressDisplayText("   "), null);
  assert.equal(legacyAddressDisplayText(null), null);
  assert.equal(legacyAddressDisplayText(undefined), null);
  const blob = "[probe-addr] texto legado livre\nlinha 2";
  assert.equal(legacyAddressDisplayText(blob), blob);
  assert.equal(isNonEmptyLegacyAddress(blob), true);
  assert.equal(isNonEmptyLegacyAddress(""), false);
});

test("saving person and process edit payloads does not modify legacy fields", () => {
  const personSubmit = omitLegacyPersonAddressFromSubmit({
    givenNames: "Ada",
    address: "[probe-addr] texto legado livre",
    addressStreet: "Main",
  });
  assert.equal("address" in personSubmit, false);
  assert.equal(personSubmit.givenNames, "Ada");
  assert.equal(personSubmit.addressStreet, "Main");

  assert.deepEqual(
    legacyPersonAddressForReplace({
      address: "[probe-addr] texto legado livre",
    }),
    { address: "[probe-addr] texto legado livre" },
  );
  assert.deepEqual(legacyPersonAddressForReplace({}), {});

  const processSubmit = omitLegacyProcessAddressFromSubmit({
    consularPost: "NY",
    residenceAddressAbroad: "Liberdade, Lisboa",
    professionalExperience: "Dev",
  });
  assert.equal("residenceAddressAbroad" in processSubmit, false);
  assert.equal(processSubmit.consularPost, "NY");
  assert.equal(processSubmit.professionalExperience, "Dev");
});

test("process card current address comes from the process table, never the person", () => {
  const processCurrent = {
    addressIsBrazil: true,
    addressStreet: "Av Paulista",
    addressNumber: "1000",
    addressCity: "São Paulo",
    addressStateCode: "SP",
    addressPostalCode: "01310-100",
    addressCountryCode: "BR",
    addressCountryName: "Brasil",
  };
  const personCurrent = {
    addressStreet: "123 Main Street",
    addressCity: "New York",
    addressCountryCode: "US",
    addressCountryName: "United States",
  };

  const selected = selectCurrentProcessAddress(processCurrent);
  assert.equal(selected?.addressStreet, "Av Paulista");
  assert.match(formatCurrentProcessAddress(processCurrent), /Av Paulista/);

  assert.equal(selectCurrentProcessAddress(null), null);
  assert.equal(formatCurrentProcessAddress(null), "");
  assert.equal(
    selectCurrentProcessAddress(personCurrent),
    null,
    "person abroad row must not appear as the process Brazil current address",
  );
  assert.equal(formatCurrentProcessAddress(personCurrent), "");
  assert.equal(
    selectCurrentProcessAddress({
      addressIsBrazil: true,
      addressCountryCode: "BR",
      addressCountryName: "Brasil",
    }),
    null,
  );

  assert.equal(legacyAddressDisplayText(""), null);
  assert.equal(
    legacyAddressDisplayText("Rua da Liberdade, Lisboa"),
    "Rua da Liberdade, Lisboa",
  );
});
