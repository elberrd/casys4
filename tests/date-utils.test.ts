import assert from "node:assert/strict";
import test from "node:test";

import { compareIsoDates } from "../lib/utils/date-utils";

test("orders ISO dates chronologically", () => {
  assert.equal(compareIsoDates("2026-01-02", "2026-01-03"), -1);
  assert.equal(compareIsoDates("2026-01-03", "2026-01-02"), 1);
  assert.equal(compareIsoDates("2026-01-02", "2026-01-02"), 0);
});

test("ignores time suffixes when comparing calendar dates", () => {
  assert.equal(compareIsoDates("2026-03-10T15:00:00", "2026-03-10"), 0);
});

test("places missing dates after dated values", () => {
  assert.equal(compareIsoDates(undefined, "2026-01-02"), 1);
  assert.equal(compareIsoDates("2026-01-02", null), -1);
  assert.equal(compareIsoDates("", ""), 0);
});
