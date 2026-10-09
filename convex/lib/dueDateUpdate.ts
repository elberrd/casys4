/**
 * Maps `tasks.update` dueDate args onto a Convex patch fragment.
 *
 * - omitted / `undefined`: do not include dueDate (leave the stored value)
 * - `null`: patch `dueDate: undefined` so Convex unsets the optional field
 * - string: set the new ISO date
 */
export function dueDateUpdatePatch(
  dueDate: string | null | undefined,
): { dueDate?: undefined } | { dueDate: string } | Record<string, never> {
  if (dueDate === undefined) {
    return {};
  }
  if (dueDate === null) {
    return { dueDate: undefined };
  }
  return { dueDate };
}
