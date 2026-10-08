/**
 * Convex `useQuery` rethrows handler errors into render. Auth, missing
 * profile, access, and not-found are expected on the dashboard — return a
 * fallback instead of crashing the tree.
 */
export function isNonFatalClientQueryError(error: unknown): boolean {
  if (error == null) return true;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (name === "ConvexError") return true;
  return (
    lower.includes("authentication required") ||
    lower.includes("not authenticated") ||
    lower.includes("user profile not found") ||
    lower.includes("user profile not activated") ||
    lower.includes("access denied") ||
    lower.includes("unauthorized") ||
    lower.includes("not found") ||
    lower.includes("not_found")
  );
}

export function fallbackOnNonFatalQueryError<T>(error: unknown, fallback: T): T {
  if (isNonFatalClientQueryError(error)) {
    return fallback;
  }
  throw error;
}
