export type LegacyAddressMigrationAction = "none" | "mark-current" | "insert";

/**
 * Whether persistLegacyAddressIfNeeded would write.
 * Callers should no-op before scheduling another mutation.
 */
export function legacyAddressMigrationAction(args: {
  existingCount: number;
  onlyAddressIsCurrent: boolean | null;
  processHasSubstantiveBrazilAddress: boolean;
}): LegacyAddressMigrationAction {
  if (args.existingCount === 1) {
    return args.onlyAddressIsCurrent === false ? "mark-current" : "none";
  }
  if (args.existingCount > 0) return "none";
  return args.processHasSubstantiveBrazilAddress ? "insert" : "none";
}

/** Client guard: run ensureLegacyMigrated at most once per process id. */
export function shouldRunLegacyMigrationOnce(
  processId: string | undefined,
  lastAttemptedProcessId: string | null,
): boolean {
  return processId !== undefined && lastAttemptedProcessId !== processId;
}
