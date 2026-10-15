import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  formatNowDateTime,
  formatStoredStatusDateTime,
  normalizeStatusDateTime,
  STATUS_BUSINESS_TIME_ZONE,
} from "../convex/lib/statusDateTime";

const utcHoursAsLocal = Date.UTC(2026, 9, 13, 19, 5);
const saoPauloPreviousDay = Date.UTC(2026, 9, 13, 2, 30);

test("STATUS_BUSINESS_TIME_ZONE is America/Sao_Paulo", () => {
  assert.equal(STATUS_BUSINESS_TIME_ZONE, "America/Sao_Paulo");
});

test("formatNowDateTime writes Sao Paulo wall-clock, not UTC hours", () => {
  // 19:05 UTC is 16:05 in America/Sao_Paulo (UTC-3, no DST).
  assert.equal(formatNowDateTime(utcHoursAsLocal), "2026-10-13T16:05");
  assert.notEqual(formatNowDateTime(utcHoursAsLocal), "2026-10-13T19:05");
});

test("formatNowDateTime crosses the Sao Paulo calendar day before UTC midnight", () => {
  assert.equal(formatNowDateTime(saoPauloPreviousDay), "2026-10-12T23:30");
});

test("normalizeStatusDateTime fills missing input and date-only times from Sao Paulo", () => {
  assert.equal(normalizeStatusDateTime(undefined, utcHoursAsLocal), "2026-10-13T16:05");
  assert.equal(
    normalizeStatusDateTime("2026-10-13", utcHoursAsLocal),
    "2026-10-13T16:05",
  );
  assert.equal(
    normalizeStatusDateTime("2026-10-13T09:41", utcHoursAsLocal),
    "2026-10-13T09:41",
  );
});

test("normalizeStatusDateTime rejects invalid formats", () => {
  assert.throws(
    () => normalizeStatusDateTime("13/10/2026", utcHoursAsLocal),
    /Invalid date format/,
  );
});

test("formatStoredStatusDateTime prints naive wall-clock without shifting to BRT from UTC", () => {
  const pt = formatStoredStatusDateTime("2026-10-13T16:05", "pt");
  assert.ok(pt);
  assert.match(pt, /16:05/);
  assert.match(pt, /13/);
  assert.equal(pt.includes("13:05"), false);
  assert.equal(pt.includes("19:05"), false);

  const en = formatStoredStatusDateTime("2026-10-13T16:05", "en");
  assert.ok(en);
  assert.match(en, /16:05/);

  const dateOnly = formatStoredStatusDateTime("2026-10-13", "pt");
  assert.ok(dateOnly);
  assert.match(dateOnly, /13/);
  assert.equal(dateOnly.includes(":"), false);

  assert.equal(formatStoredStatusDateTime("31/10/2026", "pt"), null);
});

test("statusDateTime module does not use Date local getters for save", () => {
  const source = readFileSync(
    path.join(process.cwd(), "convex/lib/statusDateTime.ts"),
    "utf8",
  );
  assert.match(source, /America\/Sao_Paulo/);
  assert.match(source, /formatToParts/);
  assert.equal(source.includes("date.getHours()"), false);
  assert.equal(source.includes("date.getMinutes()"), false);
  assert.equal(source.includes("date.getFullYear()"), false);
});
