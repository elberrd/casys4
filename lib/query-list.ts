/**
 * Referentially stable empty list for `useQuery(...) ?? empty`.
 * A fresh `[]` on every render changes effect deps and can retrigger
 * `form.reset` in a loop (React #185).
 */
export const EMPTY_QUERY_LIST: never[] = [];

export function queryListOrEmpty<T>(value: T[] | undefined): T[] {
  return value ?? (EMPTY_QUERY_LIST as T[]);
}
