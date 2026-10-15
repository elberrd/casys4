/** Strip wrapping whitespace/newlines from `NEXT_PUBLIC_CONVEX_URL`. */
export function convexUrlFromEnv(value: string | undefined): string {
  return (value ?? "").trim();
}
