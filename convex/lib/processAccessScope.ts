/**
 * Pure access-scope helpers for individual processes.
 * Kept free of Convex runtime imports so node:test can call them directly.
 *
 * Matches `individualProcesses.list`: admins see every live process; clients
 * see only processes whose companyApplicantId, userApplicantCompanyId, or
 * collectiveProcess.companyId is in the user's CURRENT company set.
 */

export type ProcessAccessRole = string;

export type ProcessCompanyFields = {
  _id: string;
  companyApplicantId?: string;
  userApplicantCompanyId?: string;
  collectiveProcessId?: string;
};

export function scopeIndividualProcessesForUser<T extends ProcessCompanyFields>(
  role: ProcessAccessRole | null | undefined,
  processes: T[],
  currentCompanyIds: ReadonlySet<string>,
  collectiveCompanyIdByCollectiveId: ReadonlyMap<string, string | undefined>,
): T[] {
  if (role == null) return [];
  if (role !== "client") return processes;
  if (currentCompanyIds.size === 0) return [];

  return processes.filter((process) => {
    if (
      process.companyApplicantId &&
      currentCompanyIds.has(process.companyApplicantId)
    ) {
      return true;
    }
    if (
      process.userApplicantCompanyId &&
      currentCompanyIds.has(process.userApplicantCompanyId)
    ) {
      return true;
    }
    if (process.collectiveProcessId) {
      const companyId = collectiveCompanyIdByCollectiveId.get(
        process.collectiveProcessId,
      );
      if (companyId && currentCompanyIds.has(companyId)) return true;
    }
    return false;
  });
}
