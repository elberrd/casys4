/**
 * documentsDelivered.documentTypeLegalFrameworkId often points at a deleted
 * documentTypesLegalFrameworks row (legacy). Queries must not throw; the UI
 * shows a removed label instead of a missing .name.
 */

export type LegalFrameworkResolution = {
  name: string | null;
  removed: boolean;
};

export function resolveLegalFrameworkRef(args: {
  associationId?: string | null;
  association: { legalFrameworkId?: string } | null;
  legalFramework: { name?: string | null } | null;
}): LegalFrameworkResolution {
  if (!args.associationId) {
    return { name: null, removed: false };
  }
  if (!args.association) {
    return { name: null, removed: true };
  }
  const name = args.legalFramework?.name?.trim() || null;
  if (!args.legalFramework || !name) {
    return { name: null, removed: true };
  }
  return { name, removed: false };
}

export function legalFrameworkLabel(
  resolution: LegalFrameworkResolution,
  copy: { removed: string },
): string | null {
  if (resolution.removed) return copy.removed;
  return resolution.name;
}
