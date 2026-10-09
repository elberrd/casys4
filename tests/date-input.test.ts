import assert from "node:assert/strict";
import test from "node:test";

import {
  countDateInputDigits,
  DateValidationErrors,
  getDatePickerMessageKey,
  maskDateInput,
  parseManualDateEntry,
  validateDateString,
} from "../lib/validations/date";
import { formatDateForStorage } from "../lib/utils";

test("maskDateInput keeps digits only and auto-inserts slashes", () => {
  assert.equal(maskDateInput("1", "pt"), "1");
  assert.equal(maskDateInput("13", "pt"), "13");
  assert.equal(maskDateInput("131", "pt"), "13/1");
  assert.equal(maskDateInput("1310", "pt"), "13/10");
  assert.equal(maskDateInput("13102", "pt"), "13/10/2");
  assert.equal(maskDateInput("13102026", "pt"), "13/10/2026");
});

test("maskDateInput strips letters, extra slashes, and extra digits", () => {
  assert.equal(maskDateInput("13a10b2026", "pt"), "13/10/2026");
  assert.equal(maskDateInput("13/10/2026", "pt"), "13/10/2026");
  assert.equal(maskDateInput("13-10-2026", "en"), "13/10/2026");
  assert.equal(maskDateInput("13102026999", "pt"), "13/10/2026");
  assert.equal(maskDateInput("", "pt"), "");
});

test("countDateInputDigits ignores separators", () => {
  assert.equal(countDateInputDigits("13/10/2026"), 8);
  assert.equal(countDateInputDigits("13/10"), 4);
  assert.equal(countDateInputDigits("ab"), 0);
});

test("parseManualDateEntry accepts valid locale dates", () => {
  const ptDate = parseManualDateEntry("13/10/2026", "pt");
  assert.ok(ptDate);
  assert.equal(ptDate.getFullYear(), 2026);
  assert.equal(ptDate.getMonth(), 9);
  assert.equal(ptDate.getDate(), 13);

  const enDate = parseManualDateEntry("10/13/2026", "en");
  assert.ok(enDate);
  assert.equal(enDate.getFullYear(), 2026);
  assert.equal(enDate.getMonth(), 9);
  assert.equal(enDate.getDate(), 13);

  const leap = parseManualDateEntry("29/02/2024", "pt");
  assert.ok(leap);
  assert.equal(leap.getDate(), 29);
});

test("parseManualDateEntry rejects invalid, incomplete, and out-of-range dates", () => {
  assert.equal(parseManualDateEntry("31/02/2026", "pt"), undefined);
  assert.equal(parseManualDateEntry("00/13/2026", "pt"), undefined);
  assert.equal(parseManualDateEntry("13/00/2026", "pt"), undefined);
  assert.equal(parseManualDateEntry("32/01/2026", "pt"), undefined);
  assert.equal(parseManualDateEntry("29/02/2025", "pt"), undefined);
  assert.equal(parseManualDateEntry("13/10", "pt"), undefined);
  assert.equal(parseManualDateEntry("13/10/202", "pt"), undefined);
  assert.equal(parseManualDateEntry("", "pt"), undefined);
  assert.equal(parseManualDateEntry("02/31/2026", "en"), undefined);
});

test("validateDateString returns specific i18n keys for invalid input", () => {
  assert.deepEqual(validateDateString("13/10/2026", "pt"), { valid: true });
  assert.deepEqual(validateDateString("10/13/2026", "en"), { valid: true });

  assert.equal(
    validateDateString("31/02/2026", "pt").error,
    DateValidationErrors.INVALID_DAY,
  );
  assert.equal(
    validateDateString("00/13/2026", "pt").error,
    DateValidationErrors.INVALID_MONTH,
  );
  assert.equal(
    validateDateString("13/00/2026", "pt").error,
    DateValidationErrors.INVALID_MONTH,
  );
  assert.equal(
    validateDateString("13/10", "pt").error,
    DateValidationErrors.INCOMPLETE,
  );
  assert.equal(
    validateDateString("13/10/20", "pt").error,
    DateValidationErrors.INCOMPLETE,
  );
  assert.equal(
    validateDateString("13-10-2026", "pt").error,
    DateValidationErrors.INVALID_FORMAT,
  );
  assert.equal(
    validateDateString("13/10/1899", "pt").error,
    DateValidationErrors.DATE_OUT_OF_RANGE,
  );
});

test("valid parsed dates convert to the ISO storage contract yyyy-MM-dd", () => {
  const parsed = parseManualDateEntry("13/10/2026", "pt");
  assert.equal(formatDateForStorage(parsed), "2026-10-13");

  const fromMask = parseManualDateEntry(maskDateInput("13102026", "pt"), "pt");
  assert.equal(formatDateForStorage(fromMask), "2026-10-13");
});

test("getDatePickerMessageKey maps full paths and unknown keys", () => {
  assert.equal(
    getDatePickerMessageKey("Common.datePicker.incompleteDate"),
    "incompleteDate",
  );
  assert.equal(getDatePickerMessageKey("invalidMonth"), "invalidMonth");
  assert.equal(getDatePickerMessageKey("not-a-key"), "invalidDate");
});
