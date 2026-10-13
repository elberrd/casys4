import assert from "node:assert/strict";
import test from "node:test";

import { PERSON_SEARCH_LIMIT, personMatchesQuery } from "../convex/lib/personSearch";
import {
  nextComboboxInternalValueAfterClear,
  resolveComboboxSelectedValue,
  toControlledComboboxValue,
} from "../lib/combobox-select";
import {
  composeInternationalPhone,
  formatStoredPhoneNumber,
  normalizeInternationalPhoneInput,
  resolvePhoneInputChange,
  stripLeadingDialCode,
} from "../lib/data/countries-phone";
import {
  isSameAddressSelection,
  nextCountryAddressFields,
  nextStateAddressFields,
} from "../lib/utils/candidate-address";
import { optionalPhoneNumberSchema } from "../lib/validations/phone";

const person = {
  givenNames: "Ana",
  middleName: "Lima",
  surname: "Souza",
  email: "ana@acme.com",
  cpf: "039.867.637-24",
};

test("daw4g: empty form value stays controlled so X can clear the label", () => {
  assert.equal(toControlledComboboxValue(""), "");
  assert.equal(toControlledComboboxValue(undefined), "");
  assert.equal(toControlledComboboxValue("company_1"), "company_1");

  const afterClearInternal = nextComboboxInternalValueAfterClear();
  assert.equal(afterClearInternal, undefined);

  // Parent stores "" and passes it through (not undefined).
  assert.equal(resolveComboboxSelectedValue("", "stale-company-id"), undefined);
  // Regression: `value || undefined` would show the stale internal selection.
  const formValue: string = "";
  const legacyUncontrolledProp: string | undefined = formValue || undefined;
  assert.equal(
    resolveComboboxSelectedValue(legacyUncontrolledProp, "stale-company-id"),
    "stale-company-id",
  );
  assert.equal(
    resolveComboboxSelectedValue("company_1", "stale-company-id"),
    "company_1",
  );
});

test("daw4j: re-selecting the same UF or country does not clear the city", () => {
  assert.equal(isSameAddressSelection("SP", "SP"), true);
  assert.equal(isSameAddressSelection("SP", "RJ"), false);
  assert.equal(isSameAddressSelection("SP", undefined), false);

  const sameState = nextStateAddressFields({
    currentStateCode: "SP",
    nextCode: "SP",
    nextStateName: "São Paulo",
    mode: "process",
  });
  assert.equal(sameState, null);

  const samePersonState = nextStateAddressFields({
    currentStateCode: "CA",
    nextCode: "CA",
    nextStateName: "California",
    mode: "person",
  });
  assert.equal(samePersonState, null);

  const changedState = nextStateAddressFields({
    currentStateCode: "SP",
    nextCode: "RJ",
    nextStateName: "Rio de Janeiro",
    mode: "process",
  });
  assert.deepEqual(changedState, {
    addressStateCode: "RJ",
    addressStateName: "Rio de Janeiro",
    addressCity: "",
  });

  const sameCountry = nextCountryAddressFields({
    currentCountryCode: "US",
    nextCode: "US",
    countryName: "United States",
  });
  assert.equal(sameCountry, null);

  const changedCountry = nextCountryAddressFields({
    currentCountryCode: "US",
    nextCode: "AR",
    countryName: "Argentina",
  });
  assert.deepEqual(changedCountry, {
    addressCountryCode: "AR",
    addressCountryName: "Argentina",
    addressStateCode: "",
    addressStateName: "",
    addressCity: "",
  });
});

test("dah0g: typing or pasting 5511… does not save +555511…", () => {
  assert.equal(stripLeadingDialCode("5511987654321", "+55"), "11987654321");
  // Brazil DDD 55 (Santa Maria) must stay on an 11-digit national number.
  assert.equal(stripLeadingDialCode("55987654321", "+55"), "55987654321");

  const typed = resolvePhoneInputChange({
    rawInput: "5511987654321",
    selectedDialCode: "+55",
    startsWithPlus: false,
  });
  assert.equal(typed.value, "+5511987654321");
  assert.equal(typed.nationalDigits, "11987654321");

  const pasted = resolvePhoneInputChange({
    rawInput: "55 11 98765-4321",
    selectedDialCode: "+55",
    startsWithPlus: false,
  });
  assert.equal(pasted.value, "+5511987654321");

  const pastedPlus = resolvePhoneInputChange({
    rawInput: "+55 11 98765-4321",
    selectedDialCode: "+55",
    startsWithPlus: true,
  });
  assert.equal(pastedPlus.value, "+5511987654321");
  assert.equal(pastedPlus.country?.code, "BR");

  const duplicated = resolvePhoneInputChange({
    rawInput: "+555511987654321",
    selectedDialCode: "+55",
    startsWithPlus: true,
  });
  assert.equal(duplicated.value, "+5511987654321");

  assert.equal(
    normalizeInternationalPhoneInput("+555511987654321"),
    "+5511987654321",
  );
  assert.equal(
    composeInternationalPhone("+55", "5511987654321"),
    "+5511987654321",
  );

  const saved = optionalPhoneNumberSchema.parse("+555511987654321");
  assert.equal(saved, "+5511987654321");
  assert.equal(optionalPhoneNumberSchema.parse(""), "");
});

test("dah0h: report phone uses the country mask instead of the raw stored value", () => {
  assert.equal(
    formatStoredPhoneNumber("+5511999990000"),
    "+55 (11) 99999-0000",
  );
  assert.equal(
    formatStoredPhoneNumber("+55 11 99999-0000"),
    "+55 (11) 99999-0000",
  );
  assert.equal(formatStoredPhoneNumber(""), "");
  assert.equal(formatStoredPhoneNumber(undefined), "");
});

test("dah0f: people search matches CPF digits and returns more than 10 hits", () => {
  assert.equal(PERSON_SEARCH_LIMIT, 50);
  assert.ok(PERSON_SEARCH_LIMIT > 10);

  assert.equal(personMatchesQuery(person, "03986763724"), true);
  assert.equal(personMatchesQuery(person, "039.867.637-24"), true);
  assert.equal(personMatchesQuery(person, "867.637"), true);
  assert.equal(personMatchesQuery({ ...person, cpf: "03986763724" }, "039.867"), true);
  assert.equal(personMatchesQuery(person, "ana lima"), true);
  assert.equal(personMatchesQuery(person, "ana@acme"), true);
  assert.equal(personMatchesQuery(person, "zzz999"), false);
  assert.equal(personMatchesQuery(person, ""), true);

  const page = Array.from({ length: 40 }, (_, index) => ({
    ...person,
    givenNames: `Pessoa ${index}`,
    cpf: `${String(index).padStart(11, "0")}`,
  })).filter((row) => personMatchesQuery(row, ""));
  assert.equal(page.length, 40);
  assert.equal(page.slice(0, PERSON_SEARCH_LIMIT).length, 40);
});
