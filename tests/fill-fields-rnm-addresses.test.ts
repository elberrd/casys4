import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { isRnmCaseStatus } from "../lib/status-history-row";

const read = (relative: string) =>
  readFileSync(path.join(process.cwd(), relative), "utf8");

const modalSource = read("components/individual-processes/fill-fields-modal.tsx");
const tableSource = read(
  "components/individual-processes/individual-process-addresses-table.tsx",
);
const dialogSource = read(
  "components/individual-processes/individual-process-address-dialog.tsx",
);
const insertHelperSource = read("convex/lib/individualProcessAddresses.ts");

test("an RNM status shows the process address table in FillFieldsModal", () => {
  assert.equal(isRnmCaseStatus({ caseStatus: { code: "rnm" } }), true);
  assert.match(modalSource, /isRnmCaseStatus\(currentStatus/);
  assert.match(modalSource, /showProcessAddresses/);
  assert.match(modalSource, /IndividualProcessAddressesTable/);
  assert.match(
    modalSource,
    /owner=\{\{ type: "process", individualProcessId \}\}/,
  );
  assert.match(modalSource, /\{showProcessAddresses \? \(/);
  assert.match(modalSource, /addresses\.savedImmediately/);
});

test("a non-RNM status does not show the process address table", () => {
  assert.equal(isRnmCaseStatus({ caseStatus: { code: "exigencia" } }), false);
  assert.equal(isRnmCaseStatus({ caseStatus: { code: "protocolo" } }), false);
  assert.match(modalSource, /showProcessAddresses \? \(/);
  assert.match(modalSource, /: null/);
  assert.equal(modalSource.includes("Registro Nacional Migratório"), false);
});

test("insert calls the process create mutation with individualProcessId", () => {
  assert.match(dialogSource, /api\.individualProcessAddresses\.create/);
  assert.match(
    dialogSource,
    /createProcessAddress\(\{\s+individualProcessId: owner\.individualProcessId,/,
  );
  assert.match(insertHelperSource, /ownerType: "process"/);
  assert.match(insertHelperSource, /unsetOtherCurrentProcessAddresses/);
});

test("delete calls the shared remove mutation on the process address id", () => {
  assert.match(tableSource, /api\.individualProcessAddresses\.remove/);
  assert.match(tableSource, /removeAddress\(\{ id: deletingAddress\._id \}\)/);
  assert.match(tableSource, /<ConfirmationDialog/);
});

test("FillFieldsModal save still only persists fillable fields, not addresses", () => {
  assert.match(modalSource, /saveFilledFields\(\{\s+statusId,\s+filledFieldsData: formData,/);
  assert.equal(modalSource.includes("individualProcessAddresses.create"), false);
  assert.equal(modalSource.includes("individualProcessAddresses.remove"), false);
});
