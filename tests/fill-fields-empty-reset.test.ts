import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  applyFillFieldsFormResetLegacy,
  fillableFieldsKey,
  filledFieldsSnapshot,
  nextFillFieldsFormData,
  nextFillFieldsModalOpenState,
  type FillableFieldsPayload,
} from "../lib/fill-fields-form";

const EMPTY_DEFERIDO: FillableFieldsPayload = {
  fillableFields: ["mreOfficeNumber"],
  filledFieldsData: {},
};

const LIMIT = 50;

function simulateQueryIdentityChurn(
  apply: (
    previous: Record<string, unknown>,
    payload: FillableFieldsPayload,
  ) => { next: Record<string, unknown>; didUpdate: boolean },
  filledFieldsData: Record<string, unknown>,
  fillableFields: readonly string[] = ["mreOfficeNumber"],
): { updates: number; stable: boolean; value: Record<string, unknown> } {
  let value: Record<string, unknown> = {};
  let updates = 0;

  for (let i = 0; i < LIMIT; i++) {
    // New object every tick — same shape Convex returns after add-status
    // when getFillableFields re-runs because individualProcess changed.
    const payload: FillableFieldsPayload = {
      fillableFields,
      filledFieldsData: { ...filledFieldsData },
    };
    const result = apply(value, payload);
    if (result.didUpdate && result.next !== value) {
      value = result.next;
      updates += 1;
      continue;
    }
    return { updates, stable: true, value };
  }

  return { updates, stable: false, value };
}

function applyLegacy(
  previous: Record<string, unknown>,
  fillableFieldsData: FillableFieldsPayload,
) {
  return applyFillFieldsFormResetLegacy(previous, {
    open: true,
    fillableFieldsData,
  });
}

function applyFixed(
  previous: Record<string, unknown>,
  fillableFieldsData: FillableFieldsPayload,
) {
  const next = nextFillFieldsFormData(previous, {
    filledSnapshot: filledFieldsSnapshot(
      fillableFieldsData.filledFieldsData ?? null,
    ),
    fillableKey: fillableFieldsKey(fillableFieldsData.fillableFields),
  });
  return { next, didUpdate: next !== previous };
}

test("legacy FillFieldsModal reset never settles on empty filledFieldsData (React #185)", () => {
  const result = simulateQueryIdentityChurn(applyLegacy, {});
  assert.equal(result.stable, false);
  assert.equal(result.updates, LIMIT);
});

test("snapshot reset settles on a freshly created deferido row with no filled fields", () => {
  const result = simulateQueryIdentityChurn(applyFixed, {});
  assert.equal(result.stable, true);
  assert.ok(result.updates < 2);
  assert.deepEqual(result.value, {});
});

test("snapshot reset settles when process values are merged into an otherwise empty status", () => {
  const result = simulateQueryIdentityChurn(
    applyFixed,
    {
      appointmentDateTime: "2026-10-08T06:38",
    },
    ["appointmentDateTime", "rnmNumber", "rnmProtocol", "rnmDeadline"],
  );
  assert.equal(result.stable, true);
  assert.ok(result.updates < 2);
  assert.equal(result.value.appointmentDateTime, "2026-10-08T06:38");
});

test("empty {} is treated as no filled data, matching getFillableFields merge", () => {
  assert.equal(filledFieldsSnapshot(EMPTY_DEFERIDO.filledFieldsData), "{}");
  const previous = {};
  const next = nextFillFieldsFormData(previous, {
    filledSnapshot: "{}",
    fillableKey: "mreOfficeNumber",
  });
  assert.equal(next, previous);
});

test("Dialog onOpenChange(true) keeps the status id so the modal does not remount", () => {
  const current = { open: true, statusId: "status_deferido" };
  assert.deepEqual(nextFillFieldsModalOpenState(current, true), current);
  assert.deepEqual(nextFillFieldsModalOpenState(current, false), {
    open: false,
    statusId: null,
  });
});

test("FillFieldsModal and the status subtable wire the identity-stable helpers", () => {
  const modal = readFileSync(
    path.join(process.cwd(), "components/individual-processes/fill-fields-modal.tsx"),
    "utf8",
  );
  const subtable = readFileSync(
    path.join(
      process.cwd(),
      "components/individual-processes/individual-process-statuses-subtable.tsx",
    ),
    "utf8",
  );
  assert.match(modal, /nextFillFieldsFormData/);
  assert.match(modal, /filledFieldsSnapshot/);
  assert.doesNotMatch(modal, /setFormData\(\{\}\)/);
  assert.match(subtable, /nextFillFieldsModalOpenState/);
  assert.doesNotMatch(
    subtable,
    /setFillFieldsModalState\(\{ open, statusId: null \}\)/,
  );
});
