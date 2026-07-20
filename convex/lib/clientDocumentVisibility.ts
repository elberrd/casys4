import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type ClientDocumentAccessScope = "all" | "exigencia_only" | "none";

export type ClientDocumentVisibility = {
  viewerRole: "admin" | "client";
  hasFullDocumentAccess: boolean;
  isCurrentExigencia: boolean;
  currentExigenciaStatusId?: Id<"individualProcessStatuses">;
  documentCreatedAtCutoff?: number;
  accessScope: ClientDocumentAccessScope;
};

/**
 * Resolves the document visibility policy for one process and the current user.
 *
 * Client users receive full document access when they created the request or
 * for administrator-created processes. Other client users only receive
 * documents linked to the currently active exigencia. Documents older than
 * the user profile are never exposed to client users.
 */
export async function resolveClientDocumentVisibility(
  ctx: QueryCtx | MutationCtx,
  userProfile: Doc<"userProfiles">,
  individualProcess: Doc<"individualProcesses">,
): Promise<ClientDocumentVisibility> {
  if (userProfile.role === "admin") {
    return {
      viewerRole: "admin",
      hasFullDocumentAccess: true,
      isCurrentExigencia: false,
      accessScope: "all",
    };
  }

  let currentStatus = await ctx.db
    .query("individualProcessStatuses")
    .withIndex("by_individualProcess_active", (q) =>
      q.eq("individualProcessId", individualProcess._id).eq("isActive", true),
    )
    .first();

  if (!currentStatus && individualProcess.caseStatusId) {
    const statusHistory = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess_date", (q) =>
        q.eq("individualProcessId", individualProcess._id),
      )
      .order("desc")
      .collect();
    currentStatus =
      statusHistory.find(
        (status) => status.caseStatusId === individualProcess.caseStatusId,
      ) ?? null;
  }

  const activeCaseStatus = currentStatus
    ? await ctx.db.get(currentStatus.caseStatusId)
    : individualProcess.caseStatusId
      ? await ctx.db.get(individualProcess.caseStatusId)
      : null;

  const isCurrentExigencia = activeCaseStatus?.code === "exigencia";
  const currentExigenciaStatusId =
    isCurrentExigencia && currentStatus ? currentStatus._id : undefined;

  const createdOwnRequest =
    userProfile.userId !== undefined &&
    individualProcess.requestedBy === userProfile.userId;
  const isAdminCreatedProcess = individualProcess.requestStatus === undefined;
  const hasFullDocumentAccess = createdOwnRequest || isAdminCreatedProcess;

  return {
    viewerRole: "client",
    hasFullDocumentAccess,
    isCurrentExigencia,
    currentExigenciaStatusId,
    documentCreatedAtCutoff: userProfile.createdAt,
    accessScope: hasFullDocumentAccess
      ? "all"
      : currentExigenciaStatusId
        ? "exigencia_only"
        : "none",
  };
}

export function canAccessDocument(
  document: Doc<"documentsDelivered">,
  visibility: ClientDocumentVisibility,
): boolean {
  if (visibility.viewerRole === "admin") return true;
  if (document.excludedFromReport === true) return false;

  const documentCreatedAt = document.createdAt ?? document._creationTime;
  if (
    visibility.documentCreatedAtCutoff !== undefined &&
    documentCreatedAt < visibility.documentCreatedAtCutoff
  ) {
    return false;
  }

  if (visibility.hasFullDocumentAccess) return true;

  return (
    visibility.currentExigenciaStatusId !== undefined &&
    document.individualProcessStatusId === visibility.currentExigenciaStatusId
  );
}

export function filterAccessibleDocuments(
  documents: Array<Doc<"documentsDelivered">>,
  visibility: ClientDocumentVisibility,
): Array<Doc<"documentsDelivered">> {
  return documents.filter((document) =>
    canAccessDocument(document, visibility),
  );
}

export function filterClientChecklistDocuments(
  documents: Array<Doc<"documentsDelivered">>,
  visibility: ClientDocumentVisibility,
  includeOtherDocuments: boolean,
): {
  documents: Array<Doc<"documentsDelivered">>;
  hiddenDocumentCount: number;
  otherDocumentCount: number;
  showingOtherDocuments: boolean;
} {
  const accessibleDocuments = filterAccessibleDocuments(documents, visibility);
  const otherDocumentCount = visibility.currentExigenciaStatusId
    ? accessibleDocuments.filter(
        (document) =>
          document.individualProcessStatusId !==
          visibility.currentExigenciaStatusId,
      ).length
    : 0;
  const shouldFocusCurrentExigencia =
    visibility.viewerRole === "client" &&
    visibility.hasFullDocumentAccess &&
    visibility.currentExigenciaStatusId !== undefined &&
    !includeOtherDocuments;

  if (!shouldFocusCurrentExigencia) {
    return {
      documents: accessibleDocuments,
      hiddenDocumentCount: 0,
      otherDocumentCount,
      showingOtherDocuments:
        visibility.viewerRole === "client" &&
        visibility.hasFullDocumentAccess &&
        visibility.isCurrentExigencia &&
        includeOtherDocuments,
    };
  }

  const focusedDocuments = accessibleDocuments.filter(
    (document) =>
      document.individualProcessStatusId ===
      visibility.currentExigenciaStatusId,
  );

  return {
    documents: focusedDocuments,
    hiddenDocumentCount: accessibleDocuments.length - focusedDocuments.length,
    otherDocumentCount,
    showingOtherDocuments: false,
  };
}
