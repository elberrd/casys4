import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { Id } from "../convex/_generated/dataModel";
import {
  deliveredDocumentChainKey,
  isDeletedTaskNotification,
  planDeliveredDocumentVersionRemoval,
  planHardDeletedDeliveredDocuments,
  selectNotesForDeletedProcess,
  selectNotificationsForDeletedTask,
  selectRefreshTokensForSessions,
  selectUnreferencedStorageIds,
  uniqueStorageIds,
  type DeliveredVersion,
} from "../convex/lib/deletionCascades";

function convexSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function exportedHandler(source: string, exportName: string): string {
  const marker = `export const ${exportName} =`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing export ${exportName}`);
  const next = source.indexOf("\nexport const ", start + marker.length);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

function notificationsTableSource(): string {
  const schema = convexSource("convex/schema.ts");
  const start = schema.indexOf("notifications: defineTable");
  assert.ok(start >= 0, "missing notifications table");
  const next = schema.indexOf("dashboardWidgets:", start);
  return schema.slice(start, next);
}

const processId = "process_1" as Id<"individualProcesses">;
const otherProcessId = "process_2" as Id<"individualProcesses">;
const typeA = "type_a" as Id<"documentTypes">;
const typeB = "type_b" as Id<"documentTypes">;
const requirementA = "req_a" as Id<"documentRequirements">;

function version(partial: {
  id: string;
  version: number;
  uploadedAt: number;
  isLatest: boolean;
  processId?: Id<"individualProcesses">;
  documentTypeId?: Id<"documentTypes">;
  documentRequirementId?: Id<"documentRequirements">;
  documentName?: string;
}): DeliveredVersion {
  return {
    _id: partial.id as Id<"documentsDelivered">,
    version: partial.version,
    uploadedAt: partial.uploadedAt,
    isLatest: partial.isLatest,
    individualProcessId: partial.processId ?? processId,
    documentTypeId: partial.documentTypeId,
    documentRequirementId: partial.documentRequirementId,
    documentName: partial.documentName,
  };
}

test("dbbay: deletes task notifications for the assignee by entityType and entityId", () => {
  const taskId = "task_1";
  const rows = [
    { _id: "n1", entityType: "task", entityId: taskId, type: "task_assigned" },
    { _id: "n2", entityType: "task", entityId: taskId, type: "task_due" },
    { _id: "n3", entityType: "task", entityId: "task_2", type: "task_assigned" },
    { _id: "n4", entityType: "note", entityId: taskId, type: "note_alarm" },
    { _id: "n5", entityType: "task", type: "task_assigned" },
  ];

  assert.equal(isDeletedTaskNotification(rows[0]!, taskId), true);
  assert.deepEqual(
    selectNotificationsForDeletedTask(rows, taskId).map((row) => row._id),
    ["n1", "n2"],
  );
});

test("dbbay: tasks.remove loads notifications by_user then filters the task entity", () => {
  const handler = exportedHandler(convexSource("convex/tasks.ts"), "remove");
  assert.match(handler, /deleteNotificationsForTask\(ctx, task\)/);
  assert.doesNotMatch(handler, /withIndex\("by_entityId"/);

  const helper = convexSource("convex/lib/deletionCascades.ts");
  assert.match(
    helper,
    /\.query\("notifications"\)[\s\S]*withIndex\("by_user"/,
  );
  assert.match(helper, /selectNotificationsForDeletedTask/);
});

test("dbbay: notifications schema still has no entityId index", () => {
  const table = notificationsTableSource();
  assert.match(table, /\.index\("by_user", \["userId"\]\)/);
  assert.doesNotMatch(table, /by_entityId/);
  assert.doesNotMatch(table, /\["entityId"\]/);
});

test("dayw9: selects refresh tokens that belong to the deleted user's sessions", () => {
  const tokens = [
    { _id: "rt1", sessionId: "sess_a" },
    { _id: "rt2", sessionId: "sess_b" },
    { _id: "rt3", sessionId: "sess_a" },
    { _id: "rt4", sessionId: "sess_orphan" },
  ];
  assert.deepEqual(
    selectRefreshTokensForSessions(tokens, ["sess_a", "sess_b"]).map(
      (token) => token._id,
    ),
    ["rt1", "rt2", "rt3"],
  );
});

test("dayw9: userProfiles.remove deletes authRefreshTokens via sessionId before sessions", () => {
  const handler = exportedHandler(
    convexSource("convex/userProfiles.ts"),
    "remove",
  );
  const tokensCall = handler.indexOf("deleteAuthRefreshTokensForSessions");
  const sessionDelete = handler.indexOf("await ctx.db.delete(session._id)");
  assert.ok(tokensCall >= 0, "refresh token cascade missing");
  assert.ok(sessionDelete >= 0, "session delete missing");
  assert.ok(
    tokensCall < sessionDelete,
    "refresh tokens must be deleted before sessions",
  );

  const helper = convexSource("convex/lib/deletionCascades.ts");
  assert.match(
    helper,
    /\.query\("authRefreshTokens"\)[\s\S]*withIndex\("sessionId"/,
  );
});

test("dayw8: removing latest v3 deletes that row and promotes v2, never keeping v3", () => {
  const v1 = version({
    id: "doc_v1",
    version: 1,
    uploadedAt: 10,
    isLatest: false,
    documentTypeId: typeA,
    documentRequirementId: requirementA,
  });
  const v2 = version({
    id: "doc_v2",
    version: 2,
    uploadedAt: 20,
    isLatest: false,
    documentTypeId: typeA,
    documentRequirementId: requirementA,
  });
  const v3 = version({
    id: "doc_v3",
    version: 3,
    uploadedAt: 30,
    isLatest: true,
    documentTypeId: typeA,
    documentRequirementId: requirementA,
  });
  const otherType = version({
    id: "doc_other",
    version: 9,
    uploadedAt: 90,
    isLatest: true,
    documentTypeId: typeB,
  });

  const plan = planDeliveredDocumentVersionRemoval(v3, [
    v1,
    v2,
    v3,
    otherType,
  ]);

  assert.equal(plan.deleteVersionId, v3._id);
  assert.equal(plan.promoteId, v2._id);
  assert.deepEqual(plan.retainedVersionIds, [v1._id, v2._id]);
  assert.equal(plan.retainedVersionIds.includes(v3._id), false);
});

test("dayw8: successive latest removals walk v3 then v2 then v1 then none", () => {
  const v1 = version({
    id: "doc_v1",
    version: 1,
    uploadedAt: 10,
    isLatest: false,
    documentTypeId: typeA,
  });
  const v2 = version({
    id: "doc_v2",
    version: 2,
    uploadedAt: 20,
    isLatest: false,
    documentTypeId: typeA,
  });
  const v3 = version({
    id: "doc_v3",
    version: 3,
    uploadedAt: 30,
    isLatest: true,
    documentTypeId: typeA,
  });

  const afterV3 = planDeliveredDocumentVersionRemoval(v3, [v1, v2, v3]);
  assert.equal(afterV3.deleteVersionId, v3._id);
  assert.equal(afterV3.promoteId, v2._id);
  assert.deepEqual(afterV3.retainedVersionIds, [v1._id, v2._id]);

  const v2NowLatest = { ...v2, isLatest: true };
  const afterV2 = planDeliveredDocumentVersionRemoval(v2NowLatest, [v1, v2NowLatest]);
  assert.equal(afterV2.deleteVersionId, v2._id);
  assert.equal(afterV2.promoteId, v1._id);
  assert.deepEqual(afterV2.retainedVersionIds, [v1._id]);
  assert.equal(afterV2.retainedVersionIds.includes(v3._id), false);

  const v1NowLatest = { ...v1, isLatest: true };
  const afterV1 = planDeliveredDocumentVersionRemoval(v1NowLatest, [v1NowLatest]);
  assert.equal(afterV1.deleteVersionId, v1._id);
  assert.equal(afterV1.promoteId, null);
  assert.deepEqual(afterV1.retainedVersionIds, []);
});

test("dayw8: deleting a non-latest version never promotes and keeps older remaining rows", () => {
  const v1 = version({
    id: "doc_v1",
    version: 1,
    uploadedAt: 10,
    isLatest: false,
    documentTypeId: typeA,
  });
  const v2 = version({
    id: "doc_v2",
    version: 2,
    uploadedAt: 20,
    isLatest: true,
    documentTypeId: typeA,
  });

  const plan = planDeliveredDocumentVersionRemoval(v1, [v1, v2]);
  assert.equal(plan.deleteVersionId, v1._id);
  assert.equal(plan.promoteId, null);
  assert.deepEqual(plan.retainedVersionIds, [v2._id]);
});

test("dayw8: the only version is deleted and nothing is promoted", () => {
  const only = version({
    id: "doc_only",
    version: 1,
    uploadedAt: 10,
    isLatest: true,
    documentTypeId: typeA,
  });
  const plan = planDeliveredDocumentVersionRemoval(only, [only]);
  assert.equal(plan.deleteVersionId, only._id);
  assert.equal(plan.promoteId, null);
  assert.deepEqual(plan.retainedVersionIds, []);
});

test("dayw8: loose documents with different names are not the same version chain", () => {
  const passport = version({
    id: "loose_a",
    version: 2,
    uploadedAt: 20,
    isLatest: true,
    documentName: "Passaporte",
  });
  const olderPassport = version({
    id: "loose_a_old",
    version: 1,
    uploadedAt: 10,
    isLatest: false,
    documentName: "Passaporte",
  });
  const contract = version({
    id: "loose_b",
    version: 5,
    uploadedAt: 50,
    isLatest: false,
    documentName: "Contrato",
  });

  assert.equal(
    deliveredDocumentChainKey(passport),
    deliveredDocumentChainKey(olderPassport),
  );
  assert.notEqual(
    deliveredDocumentChainKey(passport),
    deliveredDocumentChainKey(contract),
  );

  const plan = planDeliveredDocumentVersionRemoval(passport, [
    passport,
    olderPassport,
    contract,
  ]);
  assert.equal(plan.promoteId, olderPassport._id);
  assert.deepEqual(plan.retainedVersionIds, [olderPassport._id]);
});

test("dayw8: documentsDelivered.remove deletes that version via the shared helper", () => {
  const handler = exportedHandler(
    convexSource("convex/documentsDelivered.ts"),
    "remove",
  );
  assert.match(handler, /removeDeliveredDocumentVersion\(ctx, document\)/);
  assert.doesNotMatch(handler, /isLatest: false/);

  const helper = convexSource("convex/lib/deletionCascades.ts");
  assert.match(helper, /planDeliveredDocumentVersionRemoval/);
  assert.match(helper, /await ctx\.db\.delete\(document\._id\)/);
  assert.match(helper, /isLatest: true/);
  assert.match(helper, /selectUnreferencedStorageIds/);
});

test("dayw8: shared storage is kept when another documentsDelivered still references it", () => {
  const shared = "storage_shared" as Id<"_storage">;
  const unique = "storage_unique" as Id<"_storage">;
  const remaining = [
    { _id: "v3", storageId: unique },
    { _id: "v2", storageId: shared },
    { _id: "reused_other_process", storageId: shared },
  ];

  assert.deepEqual(
    selectUnreferencedStorageIds([shared, unique], remaining, ["v3"]),
    [unique],
  );
  assert.deepEqual(
    selectUnreferencedStorageIds([shared], remaining, ["v3"]),
    [],
  );
});

test("dayw8: shared storage among versions of the same chain is not deleted with one version", () => {
  const shared = "storage_shared" as Id<"_storage">;
  const remaining = [
    { _id: "v3", storageId: shared },
    { _id: "v2", storageId: shared },
  ];
  assert.deepEqual(
    selectUnreferencedStorageIds([shared], remaining, ["v3"]),
    [],
  );
  assert.deepEqual(
    selectUnreferencedStorageIds([shared], remaining, ["v3", "v2"]),
    [shared],
  );
});

test("dayw8: hard-deleting a process document plans unique candidate storage ids", () => {
  const shared = "storage_shared" as Id<"_storage">;
  const documents = [
    {
      _id: "doc_v1" as Id<"documentsDelivered">,
      storageId: shared,
    },
    {
      _id: "doc_v2" as Id<"documentsDelivered">,
      storageId: shared,
    },
    {
      _id: "doc_v3" as Id<"documentsDelivered">,
      storageId: "storage_other" as Id<"_storage">,
    },
    { _id: "doc_empty" as Id<"documentsDelivered"> },
  ];

  assert.deepEqual(uniqueStorageIds(documents), [shared, "storage_other"]);

  const plan = planHardDeletedDeliveredDocuments(documents);
  assert.deepEqual(plan.deleteDocumentIds, [
    "doc_v1",
    "doc_v2",
    "doc_v3",
    "doc_empty",
  ]);
  assert.deepEqual(plan.candidateStorageIds, [shared, "storage_other"]);
  assert.equal(plan.cascadeConditions, true);
  assert.equal(plan.cascadeStatusHistory, true);

  const reusedElsewhere = [
    { _id: "doc_v1", storageId: shared },
    { _id: "doc_v2", storageId: shared },
    { _id: "copy_from_reuse", storageId: shared },
  ];
  assert.deepEqual(
    selectUnreferencedStorageIds(
      plan.candidateStorageIds,
      [...reusedElsewhere, { _id: "doc_v3", storageId: "storage_other" as Id<"_storage"> }],
      plan.deleteDocumentIds,
    ),
    ["storage_other"],
  );
});

test("dac75: individualProcesses.remove hard-deletes delivered docs and their status history", () => {
  const handler = exportedHandler(
    convexSource("convex/individualProcesses.ts"),
    "remove",
  );
  assert.match(
    handler,
    /hardDeleteDeliveredDocuments\(ctx, documentsDelivered/,
  );
  assert.match(handler, /deleteNotificationsForTask\(ctx, task\)/);

  const helper = convexSource("convex/lib/deletionCascades.ts");
  assert.match(
    helper,
    /\.query\("documentStatusHistory"\)[\s\S]*withIndex\("by_document"/,
  );
  assert.match(
    helper,
    /\.query\("documentDeliveredConditions"\)[\s\S]*withIndex\("by_documentDelivered"/,
  );
  assert.match(helper, /selectUnreferencedStorageIds/);
  assert.match(helper, /ctx\.storage\.delete\(storageId\)/);
});

test("individualProcesses.remove hard-deletes process notes and attachments", () => {
  assert.deepEqual(
    selectNotesForDeletedProcess(
      [
        { _id: "n1", individualProcessId: "proc_1" },
        { _id: "n2", individualProcessId: "proc_2" },
        { _id: "n3", individualProcessId: "proc_1", isActive: false },
        { _id: "n4" },
      ],
      "proc_1",
    ).map((note) => note._id),
    ["n1", "n3"],
  );

  const handler = exportedHandler(
    convexSource("convex/individualProcesses.ts"),
    "remove",
  );
  assert.match(handler, /deleteNotesForIndividualProcess\(ctx, id\)/);
  assert.ok(
    handler.indexOf("deleteNotesForIndividualProcess") <
      handler.indexOf("await ctx.db.delete(id)"),
    "notes must be deleted before the process row",
  );

  const regen = exportedHandler(
    convexSource("convex/individualProcesses.ts"),
    "regenerateDocumentChecklist",
  );
  assert.doesNotMatch(regen, /deleteNotesForIndividualProcess/);

  const helper = convexSource("convex/lib/deletionCascades.ts");
  assert.match(
    helper,
    /\.query\("notes"\)[\s\S]*withIndex\("by_individualProcess"/,
  );
  assert.match(
    helper,
    /\.query\("noteAttachments"\)[\s\S]*withIndex\("by_note"/,
  );
  assert.match(helper, /ctx\.db\.delete\(note\._id\)/);
  assert.doesNotMatch(
    helper.slice(helper.indexOf("deleteNotesForIndividualProcess")),
    /isActive:\s*false/,
  );
});

test("G4 does not add a notifications entityId index or a backfill mutation", () => {
  const schema = convexSource("convex/schema.ts");
  const notificationsStart = schema.indexOf("notifications: defineTable");
  const notificationsTable = schema.slice(
    notificationsStart,
    schema.indexOf("dashboardWidgets:", notificationsStart),
  );
  assert.doesNotMatch(notificationsTable, /by_entityId/);

  const deliveredStart = schema.indexOf("documentsDelivered: defineTable");
  const deliveredTable = schema.slice(
    deliveredStart,
    schema.indexOf("documentStatusHistory:", deliveredStart),
  );
  assert.doesNotMatch(deliveredTable, /by_storageId/);

  const helper = convexSource("convex/lib/deletionCascades.ts");
  assert.doesNotMatch(helper, /backfill/);
  assert.doesNotMatch(helper, /orphan/);
});

test("dayw8: documents from another process are not promoted", () => {
  const current = version({
    id: "current",
    version: 2,
    uploadedAt: 20,
    isLatest: true,
    documentTypeId: typeA,
  });
  const otherProcess = version({
    id: "other",
    version: 8,
    uploadedAt: 80,
    isLatest: false,
    processId: otherProcessId,
    documentTypeId: typeA,
  });
  const plan = planDeliveredDocumentVersionRemoval(current, [
    current,
    otherProcess,
  ]);
  assert.equal(plan.promoteId, null);
  assert.deepEqual(plan.retainedVersionIds, []);
});

test("dayw8: delete dialog copy describes version removal in pt and en", () => {
  const pt = JSON.parse(convexSource("messages/pt.json")) as {
    DocumentChecklist: { deleteDocument: string; deleteDocumentDescription: string };
    DocumentReview: { deleteDocument: string; deleteDocumentConfirm: string };
  };
  const en = JSON.parse(convexSource("messages/en.json")) as {
    DocumentChecklist: { deleteDocument: string; deleteDocumentDescription: string };
    DocumentReview: { deleteDocument: string; deleteDocumentConfirm: string };
  };

  assert.match(pt.DocumentChecklist.deleteDocument, /versão/i);
  assert.match(pt.DocumentChecklist.deleteDocumentDescription, /versão anterior/i);
  assert.match(pt.DocumentChecklist.deleteDocumentDescription, /mais antigas permanecem/i);
  assert.doesNotMatch(
    pt.DocumentChecklist.deleteDocumentDescription,
    /apenas desmarca|isLatest/,
  );
  assert.match(pt.DocumentReview.deleteDocumentConfirm, /versão anterior/i);

  assert.match(en.DocumentChecklist.deleteDocument, /version/i);
  assert.match(
    en.DocumentChecklist.deleteDocumentDescription,
    /previous version/i,
  );
  assert.match(
    en.DocumentChecklist.deleteDocumentDescription,
    /Older versions remain/i,
  );
  assert.match(en.DocumentReview.deleteDocumentConfirm, /previous version/i);
});
