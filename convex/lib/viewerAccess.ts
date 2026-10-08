/**
 * Shared viewer-access helpers for unauthenticated / out-of-scope Convex
 * callers. No Convex runtime imports — callable from node:test.
 *
 * Queries: anonymous and access-denied callers receive empty/null payloads.
 * Mutations: anonymous (and non-admin, when required) throw and must not write.
 */

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
  companyId: string,
): boolean {
  if (role == null) return false;
  if (role !== "client") return true;
  return currentCompanyIds.has(companyId);
}

/**
 * Matches `documents:get` / `canAccessDocument`: admin all; client if the
 * document's companyId is theirs or the linked person belongs to their company.
 */
export function viewerCanAccessStandaloneDocument(
  role: string | null | undefined,
  clientCompanyId: string | undefined,
  document: { companyId?: string },
  personBelongsToClientCompany: boolean,
): boolean {
  if (role == null) return false;
  if (role !== "client") return true;
  if (!clientCompanyId) return false;
  if (document.companyId && document.companyId === clientCompanyId) return true;
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
