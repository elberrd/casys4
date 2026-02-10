/**
 * Constructs a full display name from person name parts.
 * Concatenates givenNames, middleName, and surname with spaces.
 */
export function getFullName(person: {
  givenNames: string
  middleName?: string | null
  surname?: string | null
}): string {
  return [person.givenNames, person.middleName, person.surname]
    .filter(Boolean)
    .join(" ")
}
