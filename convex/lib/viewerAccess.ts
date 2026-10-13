/**
 * Shared viewer-access helpers for unauthenticated / out-of-scope Convex
 * callers. No Convex runtime imports — callable from node:test.
 *
 * Queries: anonymous and access-denied callers receive empty/null payloads.
 * Mutations: anonymous (and non-admin, when required) throw and must not write.
 *
 * Cross-tenant: client A (currentCompanyIds = {co-a}) must not read or modify
 * client B data. Use with getViewerForProcess / getViewerForCompany.
 */

import {
  type ProcessCompanyFields,
  scopeIndividualProcessesForUser,
  viewerCanAccessProcess,
} from "./processAccessScope";

export { scopeIndividualProcessesForUser, viewerCanAccessProcess };
export type { ProcessCompanyFields };

export const EMPTY_FILLABLE_FIELDS = {
  fillableFields: [] as string[],
  filledFieldsData: {} as Record<string, unknown>,
};

export const EMPTY_REQUIREMENTS_CHECKLIST = {
  items: [] as Array<never>,
  summary: {
    total: 0,
    completed: 0,
    partial: 0,
    pending: 0,
  },
};

export const EMPTY_CONDITION_VALIDATION = {
  allRequiredFulfilled: false,
  hasExpiredConditions: false,
  unfulfilledRequired: [] as string[],
  expiredConditions: [] as string[],
  totalConditions: 0,
  fulfilledCount: 0,
  bypassed: false,
};

export function mergeFillableFieldValues(
  fillableFields: string[],
  processValues: Record<string, unknown>,
  statusValues: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const currentValues: Record<string, unknown> = {};
  for (const fieldName of fillableFields) {
    const value = processValues[fieldName];
    if (value !== undefined && value !== null && value !== "") {
      currentValues[fieldName] = value;
    }
  }
  return {
    ...currentValues,
    ...(statusValues ?? {}),
  };
}

export function fillableFieldsForViewer(args: {
  userProfile: unknown | null;
  canAccess: boolean;
  fillableFields: string[];
  processValues: Record<string, unknown>;
  statusValues: Record<string, unknown> | undefined;
}): {
  fillableFields: string[];
  filledFieldsData: Record<string, unknown>;
} {
  if (!args.userProfile || !args.canAccess) {
    return {
      fillableFields: [],
      filledFieldsData: {},
    };
  }
  return {
    fillableFields: args.fillableFields,
    filledFieldsData: mergeFillableFieldValues(
      args.fillableFields,
      args.processValues,
      args.statusValues,
    ),
  };
}

export function notificationsForViewer<T extends { userId: string }>(
  userProfile: { userId: string } | null,
  notifications: T[],
): T[] {
  if (!userProfile) return [];
  return notifications.filter(
    (notification) => notification.userId === userProfile.userId,
  );
}

export function notificationForViewer<T extends { userId: string }>(
  userProfile: { userId: string } | null,
  notification: T | null,
): T | null {
  if (!userProfile || !notification) return null;
  if (notification.userId !== userProfile.userId) return null;
  return notification;
}

export function dataForViewer<T>(
  userProfile: unknown | null,
  canAccess: boolean,
  data: T,
  empty: T,
): T {
  if (!userProfile || !canAccess) return empty;
  return data;
}

export function rowsForViewer<T>(
  userProfile: unknown | null,
  canAccess: boolean,
  rows: T[],
): T[] {
  return dataForViewer(userProfile, canAccess, rows, []);
}

export const documentRowsForViewer = rowsForViewer;
export const fieldValuesForViewer = rowsForViewer;
export const checklistForViewer = dataForViewer;

export function documentFlagForViewer(
  userProfile: unknown | null,
  canAccess: boolean,
  flag: boolean,
): boolean {
  if (!userProfile || !canAccess) return false;
  return flag;
}

/** Signup may learn whether an email is invited — never name, role, or company. */
export function publicPreRegisteredEmailFlag(
  profile: { userId?: string } | null,
): boolean {
  return Boolean(profile && !profile.userId);
}

export function viewerCanAccessCompany(
  role: string | null | undefined,
  currentCompanyIds: ReadonlySet<string>,
  companyId: string | undefined,
): boolean {
  if (role == null) return false;
  if (role !== "client") return true;
  if (!companyId) return false;
  return currentCompanyIds.has(companyId);
}

export function companiesForViewer<T extends { _id: string }>(
  role: string | null | undefined,
  currentCompanyIds: ReadonlySet<string>,
  companies: T[],
): T[] {
  if (role == null) return [];
  if (role !== "client") return companies;
  return companies.filter((company) => currentCompanyIds.has(company._id));
}

export function profilesForViewer<T extends { companyId?: string }>(
  role: string | null | undefined,
  currentCompanyIds: ReadonlySet<string>,
  profiles: T[],
): T[] {
  if (role == null) return [];
  if (role !== "client") return profiles;
  return profiles.filter(
    (profile) =>
      Boolean(profile.companyId) && currentCompanyIds.has(profile.companyId!),
  );
}

export function personIdsForCurrentCompanies(
  currentCompanyIds: ReadonlySet<string>,
  links: Array<{
    personId?: string;
    companyId?: string;
    isCurrent?: boolean;
  }>,
): Set<string> {
  const ids = new Set<string>();
  for (const link of links) {
    if (
      link.isCurrent &&
      link.personId &&
      link.companyId &&
      currentCompanyIds.has(link.companyId)
    ) {
      ids.add(link.personId);
    }
  }
  return ids;
}

/**
 * Note/task/history rows may hang off an individual process, a collective
 * process, or both. Clients need access to at least one linked tenant.
 */
export function viewerCanAccessLinkedRecord(args: {
  role: string | null | undefined;
  currentCompanyIds: ReadonlySet<string>;
  individualProcess?: ProcessCompanyFields | null;
  collectiveCompanyId?: string;
}): boolean {
  if (args.role == null) return false;
  if (args.role !== "client") return true;
  if (
    args.individualProcess &&
    viewerCanAccessProcess(
      args.role,
      args.currentCompanyIds,
      args.individualProcess,
      args.collectiveCompanyId,
    )
  ) {
    return true;
  }
  if (args.collectiveCompanyId) {
    return viewerCanAccessCompany(
      args.role,
      args.currentCompanyIds,
      args.collectiveCompanyId,
    );
  }
  return false;
}

export const COMPANY_HAS_PROCESSES_CODE = "COMPANY_HAS_PROCESSES";

export function countLinkedIndividualProcesses(
  companyId: string,
  processes: Array<{
    companyApplicantId?: string;
    userApplicantCompanyId?: string;
  }>,
): number {
  let count = 0;
  for (const process of processes) {
    if (
      process.companyApplicantId === companyId ||
      process.userApplicantCompanyId === companyId
    ) {
      count += 1;
    }
  }
  return count;
}

export function companyHasLinkedIndividualProcesses(
  companyId: string,
  linkedAsApplicant: { _id: string } | null,
  processes: Array<{
    companyApplicantId?: string;
    userApplicantCompanyId?: string;
  }>,
): boolean {
  if (linkedAsApplicant) return true;
  return countLinkedIndividualProcesses(companyId, processes) > 0;
}

/**
 * When a child row still exists after its parent process was deleted,
 * access control must not block cleanup. Admin (and the child's owner)
 * may write; other clients still cannot.
 *
 * Returns true only for the orphan case — callers still run the normal
 * tenant check when the parent exists.
 */
export function allowWriteWhenParentMissing(args: {
  parentMissing: boolean;
  role: string | null | undefined;
  isOwner?: boolean;
}): boolean {
  if (!args.parentMissing) return false;
  if (args.role === "admin") return true;
  return args.isOwner === true;
}

export function assertCanWriteOrphanedProcessChild(args: {
  parentMissing: boolean;
  role: string | null | undefined;
  isOwner?: boolean;
  missingMessage?: string;
}): void {
  if (!args.parentMissing) return;
  if (allowWriteWhenParentMissing(args)) return;
  throw new Error(args.missingMessage ?? "Individual process not found");
}

/**
 * Delivered-document conditions left behind after process/document delete.
 * Admin may toggle/update/remove; non-admin clients (same or other company)
 * stay denied. Live document+process is a no-op — callers still run the
 * normal tenant check.
 */
export function assertCanWriteOrphanedCondition(args: {
  documentMissing: boolean;
  processMissing: boolean;
  role: string | null | undefined;
}): void {
  assertCanWriteOrphanedProcessChild({
    parentMissing: args.documentMissing || args.processMissing,
    role: args.role,
    missingMessage: args.documentMissing
      ? "Document not found"
      : "Access denied: Process does not belong to your company",
  });
}

export function assertWriterCanAccessCompany(
  role: string | null | undefined,
  currentCompanyIds: ReadonlySet<string>,
  companyId: string,
): void {
  if (!viewerCanAccessCompany(role, currentCompanyIds, companyId)) {
    throw new Error(
      "Access denied: You do not have permission to access this company's data",
    );
  }
}

export function assertWriterCanAccessProcess(
  role: string | null | undefined,
  currentCompanyIds: ReadonlySet<string>,
  process: ProcessCompanyFields | null,
  collectiveCompanyId?: string,
): void {
  if (
    !viewerCanAccessProcess(
      role,
      currentCompanyIds,
      process,
      collectiveCompanyId,
    )
  ) {
    throw new Error("Access denied: Process does not belong to your company");
  }
}

/** Test helper: client A must not run `write` against client B's resource. */
export function crossTenantMutationGuard(
  role: string | null | undefined,
  currentCompanyIds: ReadonlySet<string>,
  otherCompanyId: string,
  write: () => void,
): { threw: boolean; wrote: boolean; message?: string } {
  let wrote = false;
  try {
    assertWriterCanAccessCompany(role, currentCompanyIds, otherCompanyId);
    write();
    wrote = true;
    return { threw: false, wrote };
  } catch (error) {
    return {
      threw: true,
      wrote,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Matches `documents:get` / `canAccessDocument`: admin all; client if the
 * document's companyId is theirs or the linked person belongs to their company.
 */
export function viewerCanAccessStandaloneDocument(
  role: string | null | undefined,
  clientCompanyIds: ReadonlySet<string> | string | undefined,
  document: { companyId?: string },
  personBelongsToClientCompany: boolean,
): boolean {
  if (role == null) return false;
  if (role !== "client") return true;
  const ids =
    typeof clientCompanyIds === "string"
      ? new Set([clientCompanyIds])
      : (clientCompanyIds ?? new Set<string>());
  if (ids.size === 0) return false;
  if (document.companyId && ids.has(document.companyId)) return true;
  return personBelongsToClientCompany;
}

export function assertAuthenticatedWriter(userProfile: unknown | null): void {
  if (userProfile == null) {
    throw new Error("Authentication required");
  }
}

export function assertAdminWriter(
  userProfile: { role: string } | null,
): void {
  assertAuthenticatedWriter(userProfile);
  if (userProfile!.role !== "admin") {
    throw new Error(
      "Access denied: This operation requires administrator privileges",
    );
  }
}

/** Test helper: anonymous callers must throw and must not run `write`. */
export function anonymousMutationGuard(
  userProfile: unknown | null,
  write: () => void,
): { threw: boolean; wrote: boolean; message?: string } {
  let wrote = false;
  try {
    assertAuthenticatedWriter(userProfile);
    write();
    wrote = true;
    return { threw: false, wrote };
  } catch (error) {
    return {
      threw: true,
      wrote,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function adminMutationGuard(
  userProfile: { role: string } | null,
  write: () => void,
): { threw: boolean; wrote: boolean; message?: string } {
  let wrote = false;
  try {
    assertAdminWriter(userProfile);
    write();
    wrote = true;
    return { threw: false, wrote };
  } catch (error) {
    return {
      threw: true,
      wrote,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
