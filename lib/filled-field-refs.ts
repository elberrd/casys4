export const FILLED_FIELD_TABLES = {
  passportId: "passports",
  applicantId: "people",
  personId: "people",
  processTypeId: "processTypes",
  legalFrameworkId: "legalFrameworks",
  cboId: "cboCodes",
} as const;

export type FilledFieldTable =
  (typeof FILLED_FIELD_TABLES)[keyof typeof FILLED_FIELD_TABLES];

export function filledFieldTableFor(
  fieldName: string,
): FilledFieldTable | null {
  if (Object.prototype.hasOwnProperty.call(FILLED_FIELD_TABLES, fieldName)) {
    return FILLED_FIELD_TABLES[fieldName as keyof typeof FILLED_FIELD_TABLES];
  }
  return null;
}

/**
 * Resolve a filledFieldsData reference only when it is a real Convex id for
 * the expected table. Legacy / display strings (and IDs from the wrong table)
 * must not be passed to `ctx.db.get` — that throws and crashes the detail page.
 */
export function resolveFilledFieldId(
  fieldName: string,
  fieldValue: unknown,
  normalizeId: (table: FilledFieldTable, value: string) => string | null,
): string | null {
  if (typeof fieldValue !== "string" || fieldValue.length === 0) {
    return null;
  }
  const table = filledFieldTableFor(fieldName);
  if (!table) return null;
  return normalizeId(table, fieldValue);
}
