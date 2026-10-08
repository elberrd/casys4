import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackOnNonFatalQueryError,
  isNonFatalClientQueryError,
} from "../lib/query-error-fallback";
import { resolveFilledFieldId } from "../lib/filled-field-refs";

test("auth and profile errors are non-fatal for layout queries", () => {
  assert.equal(
    isNonFatalClientQueryError(new Error("Authentication required")),
    true,
  );
  assert.equal(
    isNonFatalClientQueryError(
      new Error("User profile not found. Please contact an administrator"),
    ),
    true,
  );
  assert.equal(
    isNonFatalClientQueryError(
      new Error("User profile not activated. Please contact an administrator"),
    ),
    true,
  );
  assert.deepEqual(
    fallbackOnNonFatalQueryError(new Error("Authentication required"), []),
    [],
  );
});

test("access denied and not-found fall back instead of crashing get()", () => {
  assert.equal(
    isNonFatalClientQueryError(
      new Error(
        "Access denied: You do not have permission to view this individual process",
      ),
    ),
    true,
  );
  assert.equal(
    fallbackOnNonFatalQueryError(new Error("Access denied"), null),
    null,
  );
  assert.equal(
    fallbackOnNonFatalQueryError(
      new Error("INDIVIDUAL_PROCESS_NOT_FOUND"),
      null,
    ),
    null,
  );
});

test("unrelated errors still throw", () => {
  assert.throws(
    () => fallbackOnNonFatalQueryError(new Error("disk full"), []),
    /disk full/,
  );
});

test("filledFieldsData skips db.get for display strings and invalid ids", () => {
  const normalize = (table: string, value: string) =>
    value.startsWith("id_") && value.includes(table) ? value : null;

  assert.equal(
    resolveFilledFieldId("passportId", "AB123456", normalize),
    null,
  );
  assert.equal(resolveFilledFieldId("cboId", "", normalize), null);
  assert.equal(resolveFilledFieldId("notes", "hello", normalize), null);
  assert.equal(
    resolveFilledFieldId("passportId", "id_passports_1", normalize),
    "id_passports_1",
  );
});
