/**
 * Maps a form due-date string onto create/update mutation args.
 *
 * CREATE: empty value is omitted (`undefined`) so the field is not stored.
 * EDIT: empty value is `null` so `tasks.update` unsets an existing due date.
 * A non-empty ISO date is passed through in both modes.
 */
export function dueDateForTaskMutation(
  dueDate: string,
  mode: "create",
): string | undefined;
export function dueDateForTaskMutation(
  dueDate: string,
  mode: "edit",
): string | null;
export function dueDateForTaskMutation(
  dueDate: string,
  mode: "create" | "edit",
): string | null | undefined {
  if (dueDate) {
    return dueDate;
  }
  if (mode === "edit") {
    return null;
  }
  return undefined;
}
