import { QueryCtx } from "../_generated/server";
import {
  filledFieldTableFor,
  type FilledFieldTable,
} from "../../lib/filled-field-refs";

function personFullName(person: {
  givenNames: string;
  middleName?: string;
  surname?: string;
}): string {
  return [person.givenNames, person.middleName, person.surname]
    .filter(Boolean)
    .join(" ");
}

async function labelForFilledRef(
  db: QueryCtx["db"],
  table: FilledFieldTable,
  fieldValue: string,
): Promise<string> {
  switch (table) {
    case "passports": {
      const id = db.normalizeId("passports", fieldValue);
      if (!id) return fieldValue;
      const doc = await db.get(id);
      return doc?.passportNumber || fieldValue;
    }
    case "people": {
      const id = db.normalizeId("people", fieldValue);
      if (!id) return fieldValue;
      const doc = await db.get(id);
      return doc ? personFullName(doc) : fieldValue;
    }
    case "processTypes": {
      const id = db.normalizeId("processTypes", fieldValue);
      if (!id) return fieldValue;
      const doc = await db.get(id);
      return doc?.name || fieldValue;
    }
    case "legalFrameworks": {
      const id = db.normalizeId("legalFrameworks", fieldValue);
      if (!id) return fieldValue;
      const doc = await db.get(id);
      return doc?.name || fieldValue;
    }
    case "cboCodes": {
      const id = db.normalizeId("cboCodes", fieldValue);
      if (!id) return fieldValue;
      const doc = await db.get(id);
      return doc ? `${doc.code} - ${doc.title}` : fieldValue;
    }
  }
}

/**
 * Enrich filledFieldsData reference ids to labels. Invalid / cross-table ids
 * stay as the original string instead of throwing from `db.get`.
 */
export async function enrichFilledFieldsData(
  db: QueryCtx["db"],
  filledData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const enriched: Record<string, unknown> = {};
  for (const [fieldName, fieldValue] of Object.entries(filledData)) {
    if (fieldValue === null || fieldValue === undefined) {
      enriched[fieldName] = fieldValue;
      continue;
    }
    const table = filledFieldTableFor(fieldName);
    if (!table || typeof fieldValue !== "string") {
      enriched[fieldName] = fieldValue;
      continue;
    }
    enriched[fieldName] = await labelForFilledRef(db, table, fieldValue);
  }
  return enriched;
}
