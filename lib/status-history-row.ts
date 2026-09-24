/**
 * Shared clickability for Histórico do Andamento rows and the
 * «Preencher campos» icon. Keep these in lockstep: the icon renders
 * only when the row is clickable, and the row click opens the same modal.
 */

export type StatusFillableSource = {
  fillableFields?: readonly string[] | null;
  caseStatus?: { fillableFields?: readonly string[] | null } | null;
};

/** Same criterion as the «Preencher campos» icon: any non-empty fillableFields list. */
export function statusHasFillableFields(status: StatusFillableSource): boolean {
  const fromCase = status.caseStatus?.fillableFields;
  const fromStatus = status.fillableFields;
  return (
    (Array.isArray(fromCase) && fromCase.length > 0) ||
    (Array.isArray(fromStatus) && fromStatus.length > 0)
  );
}

export function getStatusHistoryRowInteraction(args: {
  isAdmin: boolean;
  isEditing: boolean;
  status: StatusFillableSource;
}): {
  canOpenFillFields: boolean;
  rowClassName: string;
} {
  const canOpenFillFields =
    args.isAdmin && !args.isEditing && statusHasFillableFields(args.status);
  return {
    canOpenFillFields,
    rowClassName: canOpenFillFields ? "cursor-pointer" : "",
  };
}

export function bindFillFieldsRowClick(
  canOpenFillFields: boolean,
  openFillFields: () => void,
): (() => void) | undefined {
  return canOpenFillFields ? openFillFields : undefined;
}

/** Icon clicks must not trigger the row's fill-fields handler. */
export function stopRowClickThen<E extends { stopPropagation: () => void }>(
  handler: () => void,
): (event: E) => void {
  return (event: E) => {
    event.stopPropagation();
    handler();
  };
}
