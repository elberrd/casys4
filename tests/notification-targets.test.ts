import assert from "node:assert/strict";
import test from "node:test";

import {
  getNotificationDestinationKind,
  getNotificationTarget,
  getSaoPauloDate,
} from "../lib/notification-targets";
import {
  getNotificationMessageDescriptor,
  getNotificationTitleKey,
} from "../lib/notification-display";

test("routes note and task reminders to their exact list context", () => {
  assert.equal(
    getNotificationTarget({ entityType: "note", entityId: "note-id" }),
    "/notes?highlight=note-id",
  );
  assert.equal(
    getNotificationTarget({ entityType: "task", entityId: "task-id" }),
    "/tasks?highlight=task-id",
  );
});

test("routes every known notification source and rejects unknown types", () => {
  assert.equal(
    getNotificationTarget({
      entityType: "individualProcess",
      entityId: "process-id",
    }),
    "/individual-processes/process-id",
  );
  assert.equal(
    getNotificationTarget({ entityType: "document", entityId: "doc/id" }),
    "/documents?highlight=doc%2Fid",
  );
  assert.equal(
    getNotificationTarget({ entityType: "unknown", entityId: "id" }),
    null,
  );
  assert.equal(getNotificationTarget({ entityType: "task" }), null);
});

test("routes document notifications to the process documentation section", () => {
  assert.equal(
    getNotificationTarget({
      type: "client_document_uploaded",
      entityType: "individualProcess",
      entityId: "process-id",
    }),
    "/individual-processes/process-id#documentation",
  );
  assert.equal(
    getNotificationTarget({
      type: "document_rejected",
      entityType: "document",
      entityId: "legacy-document-id",
      navigationEntityType: "individualProcess",
      navigationEntityId: "owning-process-id",
      navigationSection: "documentation",
    }),
    "/individual-processes/owning-process-id#documentation",
  );
  assert.equal(
    getNotificationDestinationKind({
      type: "document_approved",
      entityType: "individualProcess",
      entityId: "process-id",
    }),
    "documentation",
  );
});

test("calculates the business date in Sao Paulo instead of UTC", () => {
  const timestamp = Date.parse("2026-08-18T01:30:00.000Z");
  assert.equal(getSaoPauloDate(timestamp), "2026-08-17");
});

test("localizes known system notifications without replacing source titles", () => {
  assert.equal(
    getNotificationTitleKey("document_rejected"),
    "types.document_rejected",
  );
  assert.equal(getNotificationTitleKey("note_alarm"), null);
  assert.deepEqual(
    getNotificationMessageDescriptor({
      type: "document_rejected",
      title: "Document Rejected",
      message: 'Your document "Passaporte" was rejected: undefined',
    }),
    {
      key: "systemMessages.documentRejectedWithoutReason",
      values: { document: "Passaporte" },
    },
  );
});
