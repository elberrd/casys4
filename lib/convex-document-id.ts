/**
 * Client-side gate before calling Convex queries that historically used
 * `v.id(table)`. Malformed URL segments (spaces, slashes, hyphens, empty)
 * make `v.id` throw ArgumentValidationError; skip the query and show
 * not-found instead. Valid-looking ids for the wrong table are handled
 * on the server with `ctx.db.normalizeId`.
 */
export function canBeConvexDocumentId(
  value: string | undefined | null,
): value is string {
  if (typeof value !== "string") return false;
  const id = value.trim();
  if (id.length === 0) return false;
  return /^[a-z0-9]+$/i.test(id);
}

export function individualProcessGetArgs(
  processId: string | undefined | null,
): { id: string } | "skip" {
  return canBeConvexDocumentId(processId) ? { id: processId.trim() } : "skip";
}
