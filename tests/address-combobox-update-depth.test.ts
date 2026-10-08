import assert from "node:assert/strict";
import test from "node:test";

import {
  nextComboboxSelection,
  toggleOffComboboxSelection,
} from "../lib/combobox-select";
import {
  applyCandidateAddressDefaults,
  type CandidateAddressValue,
} from "../lib/utils/candidate-address";

const TODAY = "2026-10-08";
const BRAZIL = "BR";

type SelectFn = (
  optionValue: string,
  selectedValue: string | undefined,
) => string | undefined;

/**
 * Simulates the process-address country field on the detail page:
 * 1. empty country defaults to BR (CandidateAddressFields effect)
 * 2. cmdk fires onSelect for the visible selected option after PR #46's
 *    filter remounts the list
 *
 * Old Combobox toggled BR → undefined; the defaulting effect wrote BR back
 * (React error #185). New selection keeps BR and defaults are idempotent.
 */
function simulateCountryDefaultPingPong(select: SelectFn): {
  updates: number;
  stable: boolean;
  value: CandidateAddressValue;
} {
  let value: CandidateAddressValue = {
    addressCountryCode: "",
    addressCountryName: "",
    reportedAt: "",
  };
  let updates = 0;
  const limit = 50;
  const args = {
    countryMode: "process" as const,
    brazilCountryName: "Brasil",
    today: TODAY,
  };

  for (let i = 0; i < limit; i++) {
    const defaulted = applyCandidateAddressDefaults(value, args);
    if (defaulted !== value) {
      value = defaulted;
      updates += 1;
      continue;
    }

    const current = value.addressCountryCode;
    if (current) {
      const selected = select(current, current);
      const nextCountry = selected ?? "";
      if (nextCountry !== current) {
        value = {
          ...value,
          addressCountryCode: nextCountry,
          addressCountryName: nextCountry ? value.addressCountryName : "",
        };
        updates += 1;
        continue;
      }
    }

    return { updates, stable: true, value };
  }

  return { updates, stable: false, value };
}

test("legacy Combobox toggle + empty country defaults never stabilize (React #185)", () => {
  const result = simulateCountryDefaultPingPong(toggleOffComboboxSelection);
  assert.equal(result.stable, false);
  assert.equal(result.updates, 50);
});

test("keeping the current Combobox value lets empty-country defaults settle", () => {
  const result = simulateCountryDefaultPingPong((optionValue) =>
    nextComboboxSelection(optionValue),
  );
  assert.equal(result.stable, true);
  assert.ok(result.updates < 5);
  assert.equal(result.value.addressCountryCode, BRAZIL);
  assert.equal(result.value.reportedAt, TODAY);
});

test("applyCandidateAddressDefaults is idempotent once country and date are set", () => {
  const first = applyCandidateAddressDefaults(
    { addressCountryCode: "", reportedAt: "" },
    { countryMode: "process", brazilCountryName: "Brasil", today: TODAY },
  );
  const second = applyCandidateAddressDefaults(first, {
    countryMode: "process",
    brazilCountryName: "Brasil",
    today: TODAY,
  });
  assert.equal(second, first);
});

test("person addresses do not default an empty country to BR", () => {
  const value: CandidateAddressValue = { addressCountryCode: "" };
  const next = applyCandidateAddressDefaults(value, {
    countryMode: "person",
    brazilCountryName: "Brasil",
    today: TODAY,
  });
  assert.equal(next.addressCountryCode, "");
});
