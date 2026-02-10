/**
 * Constructs a full display name from person name parts.
 * Concatenates givenNames, middleName, and surname with spaces.
 */
export function getFullName(person: {
  givenNames?: string | null
  fullName?: string | null
  middleName?: string | null
  surname?: string | null
}): string {
  const given = person.givenNames || person.fullName || ""
  return [given, person.middleName, person.surname]
    .filter(Boolean)
    .join(" ")
}
