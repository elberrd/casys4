import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPassportPersonName,
  normalizePassportNameFields,
  parsePassportMrz,
} from "../convex/lib/passportNameNormalization";

const td3Mrz = [
  "P<ROUSTEFANESCU<<ANA<MARIA".padEnd(44, "<"),
  "1234567890ROU9001011F3001012".padEnd(44, "<"),
].join("\n");

test("formats Latin variants with title case and the basic Latin alphabet", () => {
  assert.equal(formatPassportPersonName("ȘTEFÂNESCU"), "Stefanescu");
  assert.equal(
    formatPassportPersonName("S\u0326TEFA\u0306NESCU"),
    "Stefanescu",
  );
  assert.equal(formatPassportPersonName("ANA-MARÍA D'OR"), "Ana-Maria D'Or");
});

test("preserves letters from complex scripts when no Latin source exists", () => {
  assert.equal(formatPassportPersonName("АЛЕКСЕЙ ИВАНОВ"), "Алексей Иванов");
});

test("parses country codes and the Latin holder name from a TD3 MRZ", () => {
  assert.deepEqual(parsePassportMrz(td3Mrz), {
    issuingCountryCode: "ROU",
    nationalityCode: "ROU",
    surname: "STEFANESCU",
    givenNameParts: ["ANA", "MARIA"],
  });
});

test("prefers the MRZ spelling and preserves an explicit middle-name split", () => {
  assert.deepEqual(
    normalizePassportNameFields({
      givenNames: "ANA",
      middleName: "MARÍA",
      surname: "ȘTEFĂNESCU",
      fullName: "ANA MARÍA ȘTEFĂNESCU",
      fatherName: "ION ȘTEFĂNESCU",
      motherName: null,
      mrz: td3Mrz,
    }),
    {
      givenNames: "Ana",
      middleName: "Maria",
      surname: "Stefanescu",
      fullName: "Ana Maria Stefanescu",
      fatherName: "Ion Stefanescu",
      motherName: null,
    },
  );
});
