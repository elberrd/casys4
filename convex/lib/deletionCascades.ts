import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Cascade planners and delete helpers for G4 (dbbay, dayw9, dayw8, dac75).
 * Pure planners stay runtime-free so node:test can cover each cascade
 * without Convex. No schema changes: notifications use by_user + in-memory
 * filter; refresh tokens use the existing sessionId index.
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
  demoteId: Id<"documentsDelivered">;
  promoteId: Id<"documentsDelivered"> | null;
  retainedVersionIds: Array<Id<"documentsDelivered">>;
  cascadeStorage: false;
  cascadeConditions: false;
};

/**
 * Soft-removing a version never deletes older rows, storage, or conditions.
 * Only the current latest is demoted; the previous version (highest remaining
 * version, then newest uploadedAt) becomes latest again.
 */
export function planDeliveredDocumentVersionRemoval(
  document: DeliveredVersion,
  processDocuments: DeliveredVersion[],
): DocumentVersionRemovalPlan {
  const chainKey = deliveredDocumentChainKey(document);
  const chain = processDocuments.filter(
    (candidate) => deliveredDocumentChainKey(candidate) === chainKey,
  );
  const retainedVersionIds = chain.map((item) => item._id);

  let promoteId: Id<"documentsDelivered"> | null = null;
  if (document.isLatest) {
    const previous = [...chain]
      .filter((item) => item._id !== document._id)
      .sort(
        (left, right) =>
          right.version - left.version ||
          right.uploadedAt - left.uploadedAt,
      )[0];
    promoteId = previous?._id ?? null;
  }

  return {
    demoteId: document._id,
    promoteId,
    retainedVersionIds,
    cascadeStorage: false,
    cascadeConditions: false,
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

export type HardDeletedDeliveredDocumentsPlan = {
  deleteDocumentIds: Array<Id<"documentsDelivered">>;
  deleteStorageIds: Array<Id<"_storage">>;
  cascadeConditions: true;
  cascadeStatusHistory: true;
};

/**
 * Storage, conditions, and document status history cascade only when the
 * delivered document rows themselves are hard-deleted (process delete).
 */
export function planHardDeletedDeliveredDocuments(
  documents: Array<{
    _id: Id<"documentsDelivered">;
    storageId?: Id<"_storage">;
  }>,
): HardDeletedDeliveredDocumentsPlan {
  return {
    deleteDocumentIds: documents.map((document) => document._id),
    deleteStorageIds: uniqueStorageIds(documents),
    cascadeConditions: true,
    cascadeStatusHistory: true,
  };
}

export async function hardDeleteDeliveredDocuments(
  ctx: MutationCtx,
  documents: Array<Doc<"documentsDelivered">>,
): Promise<void> {
  const plan = planHardDeletedDeliveredDocuments(documents);

  for (const document of documents) {
    const conditions = await ctx.db
      .query("documentDeliveredConditions")
      .withIndex("by_documentDelivered", (q) =>
        q.eq("documentsDeliveredId", document._id),
      )
      .collect();
    for (const condition of conditions) {
      await ctx.db.delete(condition._id);
    }

    const history = await ctx.db
      .query("documentStatusHistory")
      .withIndex("by_document", (q) => q.eq("documentId", document._id))
      .collect();
    for (const entry of history) {
      await ctx.db.delete(entry._id);
    }
  }

  for (const storageId of plan.deleteStorageIds) {
    await ctx.storage.delete(storageId);
  }

  for (const document of documents) {
    await ctx.db.delete(document._id);
  }
}
