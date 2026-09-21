import assert from "node:assert/strict";
import test from "node:test";

import {
  getWaitingStartDateOverride,
  statusDateToIsoDate,
  timestampToIsoDate,
} from "../lib/document-wait-time";

test("extracts the calendar date from an andamento datetime", () => {
  assert.equal(statusDateToIsoDate("2025-08-31T10:12"), "2025-08-31");
});

test("keeps a date-only andamento value", () => {
  assert.equal(statusDateToIsoDate("2025-08-31"), "2025-08-31");
});

test("rejects formatted display dates from other entry points", () => {
  assert.equal(statusDateToIsoDate("31/08/2025 às 10:12"), undefined);
  assert.equal(statusDateToIsoDate(undefined), undefined);
});

test("rejects impossible calendar dates", () => {
  assert.equal(statusDateToIsoDate("2025-02-31T10:12"), undefined);
});

test("timestampToIsoDate uses America/Sao_Paulo calendar days", () => {
  // 2025-08-31 10:12 in Sao Paulo (UTC-3) = 2025-08-31 13:12 UTC
  assert.equal(timestampToIsoDate(Date.UTC(2025, 7, 31, 13, 12)), "2025-08-31");
  // 02:00 UTC is still 2025-08-30 23:00 in Sao Paulo
  assert.equal(timestampToIsoDate(Date.UTC(2025, 7, 31, 2, 0)), "2025-08-30");
});

test("sends the exigência wait-start when it differs from process creation", () => {
  const processCreatedAt = Date.UTC(2025, 7, 7, 15, 0);
  assert.equal(
    getWaitingStartDateOverride({
      canEdit: true,
      waitingStartDate: "2025-08-31",
      backendWaitingStartedAt: processCreatedAt,
    }),
    "2025-08-31",
  );
});

test("does not send an override when the admin keeps the process creation date", () => {
  const processCreatedAt = Date.UTC(2025, 7, 7, 15, 0);
  assert.equal(
    getWaitingStartDateOverride({
      canEdit: true,
      waitingStartDate: timestampToIsoDate(processCreatedAt),
      backendWaitingStartedAt: processCreatedAt,
    }),
    undefined,
  );
});

test("does not send an override for non-admin uploaders", () => {
  assert.equal(
    getWaitingStartDateOverride({
      canEdit: false,
      waitingStartDate: "2025-08-31",
      backendWaitingStartedAt: Date.UTC(2025, 7, 7, 15, 0),
    }),
    undefined,
  );
});
