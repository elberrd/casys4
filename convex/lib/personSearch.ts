import { cleanDocumentNumber } from "../../lib/utils/document-masks";
import { normalizeString } from "./stringUtils";

/** Typeahead cap. Full-table collect stays; this only limits the returned page. */
export const PERSON_SEARCH_LIMIT = 50;

function personFullName(person: {
  givenNames: string;
  middleName?: string;
  surname?: string;
}): string {
  return [person.givenNames, person.middleName, person.surname]
    .filter(Boolean)
    .join(" ");
}

/**
 * Accent-insensitive name/email match plus digit-normalized CPF.
 * "03986763724" matches stored "039.867.637-24" and the reverse.
 */
export function personMatchesQuery(
  person: {
    givenNames: string;
    middleName?: string;
    surname?: string;
    email?: string;
    cpf?: string;
  },
  query: string,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const queryNormalized = normalizeString(trimmed);
  if (normalizeString(personFullName(person)).includes(queryNormalized)) {
    return true;
  }
  if (person.email && normalizeString(person.email).includes(queryNormalized)) {
    return true;
  }
  if (person.cpf) {
    const queryDigits = cleanDocumentNumber(trimmed);
    const cpfDigits = cleanDocumentNumber(person.cpf);
    if (queryDigits.length > 0 && cpfDigits.includes(queryDigits)) {
      return true;
    }
    if (
      person.cpf.includes(trimmed) ||
      person.cpf.includes(queryNormalized)
    ) {
      return true;
    }
  }
  return false;
}
