import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  bindFillFieldsRowClick,
  getStatusHistoryRowInteraction,
  statusHasFillableFields,
  stopRowClick,
  stopRowClickThen,
  toDatetimeLocalInputValue,
} from "../lib/status-history-row";

const subtableSource = readFileSync(
  path.join(
    process.cwd(),
    "components/individual-processes/individual-process-statuses-subtable.tsx",
  ),
  "utf8",
);

const withFields = { fillableFields: ["rnmNumber"] };
const withoutFields = { fillableFields: [] as string[] };
const fromCaseStatus = {
  fillableFields: [] as string[],
  caseStatus: { fillableFields: ["appointmentDateTime"] },
};

test("statusHasFillableFields matches the fill-fields icon criterion", () => {
  assert.equal(statusHasFillableFields(withFields), true);
  assert.equal(statusHasFillableFields(fromCaseStatus), true);
  assert.equal(statusHasFillableFields(withoutFields), false);
  assert.equal(statusHasFillableFields({}), false);
  assert.equal(
    statusHasFillableFields({ caseStatus: { fillableFields: [] } }),
    false,
  );
});

test("toDatetimeLocalInputValue converts legacy YYYY-MM-DD for the inline date input", () => {
  assert.equal(toDatetimeLocalInputValue("2024-01-15"), "2024-01-15T00:00");
  assert.equal(
    toDatetimeLocalInputValue("2024-01-15T14:30"),
    "2024-01-15T14:30",
  );
  assert.equal(toDatetimeLocalInputValue(""), "");
  assert.equal(toDatetimeLocalInputValue(undefined), "");
});

test("a row with fillable fields is clickable and shares the fill-fields opener", () => {
  const opened: string[] = [];
  const openFillFields = (id: string) => {
    opened.push(id);
  };

  const { canOpenFillFields, rowClassName } = getStatusHistoryRowInteraction({
    isAdmin: true,
    isEditing: false,
    isAnyRowEditing: false,
    status: withFields,
  });
  assert.equal(canOpenFillFields, true);
  assert.equal(rowClassName, "cursor-pointer");
  assert.equal(rowClassName.includes("hover:"), false);

  const onRowClick = bindFillFieldsRowClick(canOpenFillFields, () =>
    openFillFields("status-rnm"),
  );
  assert.equal(typeof onRowClick, "function");
  onRowClick?.();
  assert.deepEqual(opened, ["status-rnm"]);

  const onIconClick = stopRowClickThen(() => openFillFields("status-rnm"));
  const event = {
    stopPropagation() {
      event.stopped = true;
    },
    stopped: false,
  };
  onIconClick(event);
  assert.equal(event.stopped, true);
  assert.deepEqual(opened, ["status-rnm", "status-rnm"]);
});

test("a row without fillable fields is not clickable and has no pointer/hover/keyboard activation", () => {
  const opened: string[] = [];
  const { canOpenFillFields, rowClassName } = getStatusHistoryRowInteraction({
    isAdmin: true,
    isEditing: false,
    isAnyRowEditing: false,
    status: withoutFields,
  });
  assert.equal(canOpenFillFields, false);
  assert.equal(rowClassName, "");
  assert.equal(rowClassName.includes("cursor-pointer"), false);
  assert.equal(rowClassName.includes("hover:"), false);

  const onRowClick = bindFillFieldsRowClick(canOpenFillFields, () =>
    opened.push("should-not-run"),
  );
  assert.equal(onRowClick, undefined);
  assert.deepEqual(opened, []);
});

test("clients, this-row edit, and any-row edit disable fill-fields row click", () => {
  assert.equal(
    getStatusHistoryRowInteraction({
      isAdmin: false,
      isEditing: false,
      isAnyRowEditing: false,
      status: withFields,
    }).canOpenFillFields,
    false,
  );
  assert.equal(
    getStatusHistoryRowInteraction({
      isAdmin: true,
      isEditing: true,
      isAnyRowEditing: true,
      status: withFields,
    }).canOpenFillFields,
    false,
  );
  // 7ddbd30: editingId set for any row blocked every row click
  assert.equal(
    getStatusHistoryRowInteraction({
      isAdmin: true,
      isEditing: false,
      isAnyRowEditing: true,
      status: withFields,
    }).canOpenFillFields,
    false,
  );
  assert.equal(
    getStatusHistoryRowInteraction({
      isAdmin: true,
      isEditing: false,
      isAnyRowEditing: true,
      status: withFields,
    }).rowClassName,
    "",
  );
});

test("icon handlers stop propagation so they do not run the row click", () => {
  let rowClicked = false;
  let iconRan = false;
  const rowHandler = () => {
    rowClicked = true;
  };
  const iconHandler = stopRowClickThen(() => {
    iconRan = true;
  });

  const event = {
    stopPropagation() {
      this.stopped = true;
    },
    stopped: false,
  };

  iconHandler(event);
  if (!event.stopped) {
    rowHandler();
  }

  assert.equal(iconRan, true);
  assert.equal(event.stopped, true);
  assert.equal(rowClicked, false);
});

test("inline edit inputs stop row clicks without running a handler", () => {
  let rowClicked = false;
  const event = {
    stopPropagation() {
      this.stopped = true;
    },
    stopped: false,
  };
  stopRowClick(event);
  if (!event.stopped) {
    rowClicked = true;
  }
  assert.equal(event.stopped, true);
  assert.equal(rowClicked, false);
});

test("subtable row and fill-fields icon use the shared clickability helper and opener", () => {
  assert.match(subtableSource, /getStatusHistoryRowInteraction/);
  assert.match(subtableSource, /isAnyRowEditing/);
  assert.match(subtableSource, /canOpenFillFields/);
  assert.match(
    subtableSource,
    /onClick=\{bindFillFieldsRowClick\(canOpenFillFields, \(\) =>\s+openFillFields\(status\._id\),/,
  );
  assert.match(subtableSource, /\{canOpenFillFields && \(/);
  assert.match(subtableSource, /openFillFields\(status\._id\)/);
  assert.equal(subtableSource.includes("handleRowClick"), false);
  assert.equal(
    subtableSource.includes(
      'isAdmin && !editingId ? "cursor-pointer hover:bg-muted/50"',
    ),
    false,
  );
  assert.equal(subtableSource.includes("tabIndex"), false);
  assert.equal(subtableSource.includes('role="button"'), false);
  assert.equal(subtableSource.includes("onKeyDown"), false);
});

test("pencil triggers inline edit via handleEditClick; details icon opens EditStatusDialog", () => {
  assert.match(subtableSource, /const handleEditClick = \(/);
  assert.match(subtableSource, /toDatetimeLocalInputValue\(currentDate\)/);
  assert.match(
    subtableSource,
    /stopRowClickThen\(\(\) => \{\s+handleEditClick\(status\._id, status\.date, status\.caseStatusId\);/,
  );
  assert.match(subtableSource, /t\("editStatus"\)/);
  assert.match(
    subtableSource,
    /stopRowClickThen\(\(\) => \{\s+openEditStatusDetails\(status\);/,
  );
  assert.match(subtableSource, /<FileText /);
  assert.match(subtableSource, /title=\{t\("editStatusDetails"\)\}/);
  assert.match(subtableSource, /aria-label=\{t\("editStatusDetails"\)\}/);
  assert.match(subtableSource, /<EditStatusDialog/);
  assert.match(subtableSource, /onClick=\{stopRowClick\}/);
  assert.match(subtableSource, /onPointerDown=\{stopRowClick\}/);
});

test("icons stop row clicks; map pin, fill-fields, pencil, details, trash", () => {
  assert.match(subtableSource, /stopRowClickThen\(\(\) => \{\s+openFillFields\(status\._id\);/);
  assert.match(subtableSource, /stopRowClickThen\(\(\) => \{\s+onOpenProcessAddressTable\(\);/);
  assert.match(
    subtableSource,
    /stopRowClickThen\(\(\) => \{\s+handleEditClick\(status\._id, status\.date, status\.caseStatusId\);/,
  );
  assert.match(subtableSource, /stopRowClickThen\(\(\) => \{\s+openEditStatusDetails\(status\);/);
  assert.match(subtableSource, /stopRowClickThen\(\(\) => \{\s+handleDeleteClick\(/);
});
