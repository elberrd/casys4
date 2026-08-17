import assert from "node:assert/strict";
import test from "node:test";

import { getOrderedFilledFieldEntries } from "../lib/individual-process-fields";

test("orders RNM fields for display", () => {
  const filledFieldsData = {
    appointmentDateTime: "2025-09-09T14:35:00.000Z",
    rnmDeadline: "2026-09-09",
    rnmNumber: "B422063N",
    rnmProtocol: "202508251427115407",
  };

  const entries = getOrderedFilledFieldEntries(
    filledFieldsData,
    Object.keys(filledFieldsData),
  );

  assert.deepEqual(
    entries.map(([fieldName]) => fieldName),
    ["appointmentDateTime", "rnmProtocol", "rnmNumber", "rnmDeadline"],
  );
});

test("keeps the existing DOU display order", () => {
  const filledFieldsData = {
    douPage: "10",
    douNumber: "123",
    douSection: "1",
  };

  const entries = getOrderedFilledFieldEntries(
    filledFieldsData,
    Object.keys(filledFieldsData),
  );

  assert.deepEqual(
    entries.map(([fieldName]) => fieldName),
    ["douNumber", "douSection", "douPage"],
  );
});
