import { COMPANY_HAS_PROCESSES_CODE } from "../convex/lib/viewerAccess";

export { COMPANY_HAS_PROCESSES_CODE };

function pushParsedJson(candidates: unknown[], value: string): void {
  const jsonStart = value.indexOf("{");
  if (jsonStart < 0) return;
  try {
    candidates.push(JSON.parse(value.slice(jsonStart)));
  } catch {
    // ConvexError messages are not always JSON.
  }
}

function countFromData(data: unknown): number | null {
  if (typeof data !== "object" || data === null) return null;
  if (!("code" in data)) return null;
  if ((data as { code: unknown }).code !== COMPANY_HAS_PROCESSES_CODE) {
    return null;
  }
  const count = (data as { count?: unknown }).count;
  if (typeof count !== "number" || !Number.isFinite(count) || count < 1) {
    return null;
  }
  return count;
}

/**
 * Reads N from companies.remove's ConvexError({ code, count }).
 * Convex may expose the payload on `data` or stringify it into `message`.
 */
export function linkedProcessCountFromDeleteError(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;

  const candidates: unknown[] = [];
  if ("data" in error) {
    candidates.push((error as { data: unknown }).data);
  }
  if ("message" in error && typeof (error as { message: unknown }).message === "string") {
    pushParsedJson(candidates, (error as { message: string }).message);
  }

  for (const data of candidates) {
    if (typeof data === "string") {
      pushParsedJson(candidates, data);
      continue;
    }
    const count = countFromData(data);
    if (count !== null) return count;
  }
  return null;
}

export function companyDeleteErrorMessage(
  error: unknown,
  t: (key: string, values?: { count: number }) => string,
): string {
  const count = linkedProcessCountFromDeleteError(error);
  if (count !== null) {
    return t("cannotDeleteLinked", { count });
  }
  return t("errorDelete");
}
