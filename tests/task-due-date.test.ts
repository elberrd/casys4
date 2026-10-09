import assert from "node:assert/strict";
import test from "node:test";

import { dueDateUpdatePatch } from "../convex/lib/dueDateUpdate";
import { dueDateForTaskMutation } from "../lib/task-due-date";

test("cleared due date on edit is sent as null so update unsets the field", () => {
  assert.equal(dueDateForTaskMutation("", "edit"), null);
});

test("unchanged due date on edit is sent as the ISO value", () => {
  assert.equal(dueDateForTaskMutation("2026-10-15", "edit"), "2026-10-15");
});

test("empty due date on create is omitted", () => {
  assert.equal(dueDateForTaskMutation("", "create"), undefined);
});

test("filled due date on create is sent as the ISO value", () => {
  assert.equal(dueDateForTaskMutation("2026-10-15", "create"), "2026-10-15");
});

test("update patch unsets dueDate when the arg is null", () => {
  const patch = dueDateUpdatePatch(null);
  assert.equal("dueDate" in patch, true);
  assert.equal(patch.dueDate, undefined);
});

test("update patch leaves dueDate untouched when the arg is omitted", () => {
  const patch = dueDateUpdatePatch(undefined);
  assert.deepEqual(patch, {});
  assert.equal("dueDate" in patch, false);
});

test("update patch sets dueDate when the arg is a string", () => {
  assert.deepEqual(dueDateUpdatePatch("2026-10-15"), { dueDate: "2026-10-15" });
});
