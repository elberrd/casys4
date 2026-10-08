/**
 * FillFieldsModal form reset. Opening «Preencher campos» on a freshly created
 * status (no filledFieldsData yet) used to key a useEffect on the Convex query
 * object. `filledFieldsData: {}` is truthy, so every reactive result identity
 * called setFormData — React #185 when the query retriggers after add-status.
 */

export type FillableFieldsPayload = {
  fillableFields?: readonly string[] | null;
  filledFieldsData?: Record<string, unknown> | null;
};

export type FillFieldsModalOpenState<TStatusId> = {
  open: boolean;
  statusId: TStatusId | null;
};

function recordsShallowEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Object.is(left[key], right[key]));
}

export function filledFieldsSnapshot(filledFieldsData: unknown): string {
  if (filledFieldsData == null) return "null";
  return JSON.stringify(filledFieldsData);
}

export function fillableFieldsKey(
  fillableFields: readonly string[] | null | undefined,
): string {
  return (fillableFields ?? []).join("\0");
}

export function pickFilledFieldsForForm(
  filledFieldsData: Record<string, unknown>,
  fillableFields: readonly string[],
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filledFieldsData)) {
    if (fillableFields.includes(key)) {
      next[key] = value;
    }
  }
  return next;
}

/**
 * Pre-fix FillFieldsModal effect: always setState, and `{}` counts as data.
 * Convex returning a new query object each tick never settles.
 */
export function applyFillFieldsFormResetLegacy(
  _previous: Record<string, unknown>,
  args: {
    open: boolean;
    fillableFieldsData: FillableFieldsPayload | undefined;
  },
): { next: Record<string, unknown>; didUpdate: boolean } {
  if (!args.open) {
    return { next: _previous, didUpdate: false };
  }

  let next: Record<string, unknown> = {};
  const filled = args.fillableFieldsData?.filledFieldsData;
  if (filled) {
    next = pickFilledFieldsForForm(
      filled,
      args.fillableFieldsData?.fillableFields ?? [],
    );
  }
  return { next, didUpdate: true };
}

export function nextFillFieldsFormData(
  previous: Record<string, unknown>,
  args: {
    filledSnapshot: string;
    fillableKey: string;
  },
): Record<string, unknown> {
  if (
    !args.filledSnapshot ||
    args.filledSnapshot === "null" ||
    args.filledSnapshot === "{}"
  ) {
    return Object.keys(previous).length === 0 ? previous : {};
  }

  const parsed = JSON.parse(args.filledSnapshot) as Record<string, unknown>;
  const fillableFieldNames = args.fillableKey ? args.fillableKey.split("\0") : [];
  const filtered = pickFilledFieldsForForm(parsed, fillableFieldNames);
  return recordsShallowEqual(previous, filtered) ? previous : filtered;
}

/** Dialog onOpenChange(true) must not wipe the status id (that remounts the modal). */
export function nextFillFieldsModalOpenState<TStatusId>(
  current: FillFieldsModalOpenState<TStatusId>,
  open: boolean,
): FillFieldsModalOpenState<TStatusId> {
  if (open) {
    return { open: true, statusId: current.statusId };
  }
  return { open: false, statusId: null };
}
