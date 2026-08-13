import assert from "node:assert/strict";
import test from "node:test";

import {
  getCountryCodeCandidates,
  isCountryCodeLike,
} from "../convex/lib/countryCodeNormalization";
import { parsePassportMrz } from "../convex/lib/passportNameNormalization";

const norwegianTd3Mrz = [
  "P<NORTEST<<PERSON".padEnd(44, "<"),
  "1234567890NOR".padEnd(44, "<"),
].join("\n");

test("extracts Norway's ISO-3 code from both TD3 country positions", () => {
  const identity = parsePassportMrz(norwegianTd3Mrz);

  assert.equal(identity?.issuingCountryCode, "NOR");
  assert.equal(identity?.nationalityCode, "NOR");
});

test("converts the MRZ code NOR to Norway's stored ISO-2 code", () => {
  assert.deepEqual(getCountryCodeCandidates("NOR"), ["NOR", "NO"]);
  assert.deepEqual(getCountryCodeCandidates("PRK"), ["PRK", "KP"]);
  assert.notDeepEqual(getCountryCodeCandidates("NOR"), ["NOR", "KP"]);
});

test("keeps ISO-like values out of partial country-name matching", () => {
  assert.equal(isCountryCodeLike("NOR"), true);
  assert.equal(isCountryCodeLike("NO"), true);
  assert.equal(isCountryCodeLike("Norway"), false);
});
