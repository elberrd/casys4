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

/**
 * Inline date edit: datetime-local needs `YYYY-MM-DDTHH:mm`.
 * Legacy status dates are `YYYY-MM-DD` — append `T00:00`.
 */
export function toDatetimeLocalInputValue(currentDate?: string): string {
  let dateForInput = currentDate || "";
  if (dateForInput && !dateForInput.includes("T")) {
    dateForInput = `${dateForInput}T00:00`;
  }
  return dateForInput;
}

/**
 * Passed as TableRow className. TableRow always applies `hover:bg-muted/50`
 * first; twMerge in `cn(base, className)` lets these win.
 */
export const STATUS_HISTORY_CLICKABLE_ROW_CLASSNAME =
  "cursor-pointer hover:bg-muted/50";
export const STATUS_HISTORY_NON_CLICKABLE_ROW_CLASSNAME =
  "hover:bg-transparent";

export function getStatusHistoryRowInteraction(args: {
  isAdmin: boolean;
  isEditing: boolean;
  isAnyRowEditing: boolean;
  status: StatusFillableSource;
}): {
  canOpenFillFields: boolean;
  rowClassName: string;
} {
  const canOpenFillFields =
    args.isAdmin &&
    !args.isEditing &&
    !args.isAnyRowEditing &&
    statusHasFillableFields(args.status);
  return {
    canOpenFillFields,
    rowClassName: canOpenFillFields
      ? STATUS_HISTORY_CLICKABLE_ROW_CLASSNAME
      : STATUS_HISTORY_NON_CLICKABLE_ROW_CLASSNAME,
  };
}

export function bindFillFieldsRowClick(
  canOpenFillFields: boolean,
  openFillFields: () => void,
): (() => void) | undefined {
  return canOpenFillFields ? openFillFields : undefined;
}

/** Stop the row's fill-fields handler without running another action. */
export function stopRowClick<E extends { stopPropagation: () => void }>(
  event: E,
): void {
  event.stopPropagation();
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
