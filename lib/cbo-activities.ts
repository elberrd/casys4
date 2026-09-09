/**
 * Helpers for copying CBO occupation activities onto an individual process.
 * The process keeps its own editable copy so staff can tweak wording
 * without changing the master CBO record.
 */

export function cboActivityText(
  cbo: { activity?: string | null } | null | undefined,
): string {
  return cbo?.activity?.trim() ?? "";
}

/** Auto-fill the process copy only when the field is still empty. */
export function nextCboActivitiesOnSelection(args: {
  currentActivities: string | null | undefined;
  nextCboActivity: string | null | undefined;
}): string | null {
  const current = args.currentActivities?.trim() ?? "";
  if (current) return null;
  const next = args.nextCboActivity?.trim() ?? "";
  return next ? next : null;
}
