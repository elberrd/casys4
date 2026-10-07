/**
 * Helpers for copying CBO occupation activities onto an individual process.
 * The process keeps its own editable copy so staff can tweak wording
 * without changing the master CBO record.
 */

export const CBO_ACTIVITIES_COPY_FEEDBACK_MS = 1500;

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

/**
 * Text to copy from the process "Atividades CBO" field.
 * Uses the current form value, not the original CBO occupation text.
 */
export function cboActivitiesClipboardText(
  currentActivities: string | null | undefined,
): string | null {
  if (currentActivities == null) return null;
  if (!currentActivities.trim()) return null;
  return currentActivities;
}

export type CboActivitiesClipboardCopyResult = "copied" | "empty" | "error";

/** Copy the current textarea value. Never reads the original CBO record. */
export async function copyCurrentCboActivitiesToClipboard(
  currentActivities: string | null | undefined,
  writeText: (text: string) => Promise<void>,
): Promise<CboActivitiesClipboardCopyResult> {
  const text = cboActivitiesClipboardText(currentActivities);
  if (text === null) return "empty";
  try {
    await writeText(text);
    return "copied";
  } catch {
    return "error";
  }
}
