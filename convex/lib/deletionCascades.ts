import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Cascade planners and delete helpers for G4 (dbbay, dayw9, dayw8, dac75).
 * Pure planners stay runtime-free so node:test can cover each cascade
 * without Convex. No schema changes: notifications use by_user + in-memory
 * filter; refresh tokens use the existing sessionId index; shared storage
 * is detected with existing documentsDelivered / individualProcesses indexes.
 */

export function isDeletedTaskNotification(
  notification: { entityType?: string; entityId?: string },
  taskId: string,
): boolean {
  return notification.entityType === "task" && notification.entityId === taskId;
}

export function selectNotificationsForDeletedTask<
  T extends { entityType?: string; entityId?: string },
>(notifications: T[], taskId: string): T[] {
  return notifications.filter((notification) =>
    isDeletedTaskNotification(notification, taskId),
  );
}

export async function deleteNotificationsForTask(
  ctx: MutationCtx,
  task: { _id: Id<"tasks">; assignedTo?: Id<"users"> },
): Promise<number> {
  const assignedTo = task.assignedTo;
  if (!assignedTo) return 0;

  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_user", (q) => q.eq("userId", assignedTo))
    .collect();

  const toDelete = selectNotificationsForDeletedTask(notifications, task._id);
  for (const notification of toDelete) {
    await ctx.db.delete(notification._id);
  }
  return toDelete.length;
}

export function selectRefreshTokensForSessions<T extends { sessionId: string }>(
  tokens: T[],
  sessionIds: Iterable<string>,
): T[] {
  const sessions = new Set(sessionIds);
  return tokens.filter((token) => sessions.has(token.sessionId));
}

export async function deleteAuthRefreshTokensForSessions(
  ctx: MutationCtx,
  sessionIds: Array<Id<"authSessions">>,
): Promise<number> {
  let deleted = 0;
  for (const sessionId of sessionIds) {
    const tokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const token of tokens) {
      await ctx.db.delete(token._id);
      deleted += 1;
    }
  }
  return deleted;
}

export type DeliveredVersion = {
  _id: Id<"documentsDelivered">;
  version: number;
  uploadedAt: number;
  isLatest: boolean;
  individualProcessId: Id<"individualProcesses">;
  documentTypeId?: Id<"documentTypes">;
  documentRequirementId?: Id<"documentRequirements">;
  documentName?: string;
};

export function deliveredDocumentChainKey(document: DeliveredVersion): string {
  if (document.documentTypeId) {
    return [
      `process:${document.individualProcessId}`,
      `type:${document.documentTypeId}`,
      `requirement:${document.documentRequirementId ?? "none"}`,
    ].join("|");
  }

  const looseName = document.documentName?.trim().toLocaleLowerCase();
  if (looseName) {
    return `process:${document.individualProcessId}|loose-name:${looseName}`;
  }

  return `process:${document.individualProcessId}|loose:${document._id}`;
}

export type DocumentVersionRemovalPlan = {
  deleteVersionId: Id<"documentsDelivered">;
  promoteId: Id<"documentsDelivered"> | null;
  retainedVersionIds: Array<Id<"documentsDelivered">>;
};

/**
 * Removing a version deletes that specific row only. Older versions stay.
 * If the removed row was latest, the immediately previous remaining version
 * (highest version, then newest uploadedAt) becomes latest. Repeated removes
 * walk v3 → v2 → v1 → none and cannot resurrect a deleted row.
 */
export function planDeliveredDocumentVersionRemoval(
  document: DeliveredVersion,
  processDocuments: DeliveredVersion[],
): DocumentVersionRemovalPlan {
  const chainKey = deliveredDocumentChainKey(document);
  const remaining = processDocuments.filter(
    (candidate) =>
      candidate._id !== document._id &&
      deliveredDocumentChainKey(candidate) === chainKey,
  );

  let promoteId: Id<"documentsDelivered"> | null = null;
  if (document.isLatest) {
    const previous = [...remaining].sort(
      (left, right) =>
        right.version - left.version || right.uploadedAt - left.uploadedAt,
    )[0];
    promoteId = previous?._id ?? null;
  }

  return {
    deleteVersionId: document._id,
    promoteId,
    retainedVersionIds: remaining.map((item) => item._id),
  };
}

export function uniqueStorageIds(
  documents: Array<{ storageId?: Id<"_storage"> }>,
): Array<Id<"_storage">> {
  const ids: Array<Id<"_storage">> = [];
  const seen = new Set<string>();
  for (const document of documents) {
    if (!document.storageId || seen.has(document.storageId)) continue;
    seen.add(document.storageId);
    ids.push(document.storageId);
  }
  return ids;
}

/**
 * Drop storage IDs that another remaining documentsDelivered row still uses
 * (same-process versions, reuseCompanyDocument, bulkReuse, createFromExisting).
 */
export function selectUnreferencedStorageIds(
  candidateStorageIds: Array<Id<"_storage">>,
  remainingDocuments: Array<{
    _id: string;
    storageId?: Id<"_storage">;
  }>,
  deletingDocumentIds: Iterable<string>,
): Array<Id<"_storage">> {
  const deleting = new Set<string>();
  for (const id of deletingDocumentIds) deleting.add(id);

  const stillUsed = new Set<string>();
  for (const document of remainingDocuments) {
    if (deleting.has(document._id)) continue;
    if (document.storageId) stillUsed.add(document.storageId);
  }

  return uniqueStorageIds(
    candidateStorageIds
      .filter((storageId) => !stillUsed.has(storageId))
      .map((storageId) => ({ storageId })),
  );
}

export type HardDeletedDeliveredDocumentsPlan = {
  deleteDocumentIds: Array<Id<"documentsDelivered">>;
  candidateStorageIds: Array<Id<"_storage">>;
  cascadeConditions: true;
  cascadeStatusHistory: true;
};

export function planHardDeletedDeliveredDocuments(
  documents: Array<{
    _id: Id<"documentsDelivered">;
    storageId?: Id<"_storage">;
  }>,
): HardDeletedDeliveredDocumentsPlan {
  return {
    deleteDocumentIds: documents.map((document) => document._id),
    candidateStorageIds: uniqueStorageIds(documents),
    cascadeConditions: true,
    cascadeStatusHistory: true,
  };
}

export type StorageShareScope = {
  companyApplicantId?: Id<"companies">;
  personId?: Id<"people">;
};

async function loadDocumentsThatMayShareStorage(
  ctx: MutationCtx,
  documents: Array<Doc<"documentsDelivered">>,
  extras?: StorageShareScope,
): Promise<Array<Doc<"documentsDelivered">>> {
  const byId = new Map<string, Doc<"documentsDelivered">>();
  const add = (rows: Array<Doc<"documentsDelivered">>) => {
    for (const row of rows) byId.set(row._id, row);
  };

  const processIds = new Set<Id<"individualProcesses">>();
  for (const document of documents) {
    processIds.add(document.individualProcessId);
  }

  const companyIds = new Set<Id<"companies">>();
  if (extras?.companyApplicantId) {
    companyIds.add(extras.companyApplicantId);
  }
  for (const document of documents) {
    if (document.companyId) companyIds.add(document.companyId);
  }

  for (const companyId of companyIds) {
    const processes = await ctx.db
      .query("individualProcesses")
      .withIndex("by_companyApplicant", (q) =>
        q.eq("companyApplicantId", companyId),
      )
      .collect();
    for (const process of processes) {
      processIds.add(process._id);
    }

    add(
      await ctx.db
        .query("documentsDelivered")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect(),
    );
  }

  const personIds = new Set<Id<"people">>();
  if (extras?.personId) personIds.add(extras.personId);
  for (const document of documents) {
    if (document.personId) personIds.add(document.personId);
  }
  for (const personId of personIds) {
    add(
      await ctx.db
        .query("documentsDelivered")
        .withIndex("by_person", (q) => q.eq("personId", personId))
        .collect(),
    );
  }

  for (const processId of processIds) {
    add(
      await ctx.db
        .query("documentsDelivered")
        .withIndex("by_individualProcess", (q) =>
          q.eq("individualProcessId", processId),
        )
        .collect(),
    );
  }

  return [...byId.values()];
}

async function deleteConditionsAndHistoryForDocument(
  ctx: MutationCtx,
  documentId: Id<"documentsDelivered">,
): Promise<void> {
  const conditions = await ctx.db
    .query("documentDeliveredConditions")
    .withIndex("by_documentDelivered", (q) =>
      q.eq("documentsDeliveredId", documentId),
    )
    .collect();
  for (const condition of conditions) {
    await ctx.db.delete(condition._id);
  }

  const history = await ctx.db
    .query("documentStatusHistory")
    .withIndex("by_document", (q) => q.eq("documentId", documentId))
    .collect();
  for (const entry of history) {
    await ctx.db.delete(entry._id);
  }
}

async function deleteUnreferencedStorage(
  ctx: MutationCtx,
  candidateStorageIds: Array<Id<"_storage">>,
  deletingDocuments: Array<Doc<"documentsDelivered">>,
  extras?: StorageShareScope,
): Promise<void> {
  const remaining = await loadDocumentsThatMayShareStorage(
    ctx,
    deletingDocuments,
    extras,
  );
  const safeToDelete = selectUnreferencedStorageIds(
    candidateStorageIds,
    remaining,
    deletingDocuments.map((document) => document._id),
  );
  for (const storageId of safeToDelete) {
    await ctx.storage.delete(storageId);
  }
}

export async function removeDeliveredDocumentVersion(
  ctx: MutationCtx,
  document: Doc<"documentsDelivered">,
): Promise<Id<"documentsDelivered"> | null> {
  const processDocuments = await ctx.db
    .query("documentsDelivered")
    .withIndex("by_individualProcess", (q) =>
      q.eq("individualProcessId", document.individualProcessId),
    )
    .collect();

  const plan = planDeliveredDocumentVersionRemoval(document, processDocuments);

  if (plan.promoteId) {
    await ctx.db.patch(plan.promoteId, { isLatest: true });
  }

  const process = await ctx.db.get(document.individualProcessId);
  await deleteUnreferencedStorage(
    ctx,
    uniqueStorageIds([document]),
    [document],
    {
      companyApplicantId: process?.companyApplicantId,
      personId: document.personId ?? process?.personId,
    },
  );

  await deleteConditionsAndHistoryForDocument(ctx, document._id);
  await ctx.db.delete(document._id);

  return plan.promoteId;
}

export async function hardDeleteDeliveredDocuments(
  ctx: MutationCtx,
  documents: Array<Doc<"documentsDelivered">>,
  extras?: StorageShareScope,
): Promise<void> {
  if (documents.length === 0) return;

  const plan = planHardDeletedDeliveredDocuments(documents);
  await deleteUnreferencedStorage(
    ctx,
    plan.candidateStorageIds,
    documents,
    extras,
  );

  for (const document of documents) {
    await deleteConditionsAndHistoryForDocument(ctx, document._id);
  }

  for (const document of documents) {
    await ctx.db.delete(document._id);
  }
}
