import assert from "node:assert/strict";
import test from "node:test";

import { getBrazilStateName } from "../lib/data/brazil-states";
import {
  applyBrazilCheckbox,
  applyCepLookupResult,
  EMPTY_CANDIDATE_ADDRESS_FORM,
  formatCandidateAddress,
  isBrazilAddressSelected,
  personAddressFormFromRecord,
  personAddressValueFromForm,
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

test("empty address form starts with Brazil checked so CEP search is ready", () => {
  assert.equal(EMPTY_CANDIDATE_ADDRESS_FORM.addressIsBrazil, true);
  assert.equal(EMPTY_CANDIDATE_ADDRESS_FORM.addressCountryCode, "BR");
  assert.equal(isBrazilAddressSelected({}), true);
  assert.equal(isBrazilAddressSelected({ addressIsBrazil: false }), false);
  assert.equal(
    isBrazilAddressSelected({ addressCountryCode: "US" }),
    false,
  );
  assert.equal(personAddressFormFromRecord(null).addressIsBrazil, true);
  assert.equal(personAddressFormFromRecord(null).addressCountryCode, "BR");
  assert.equal(
    personAddressFormFromRecord({ addressIsBrazil: false }).addressIsBrazil,
    false,
  );
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
