const STORAGE_KEY = "casys4.originalReportReturn";

const ALLOWED_RETURN_PARAMS = ["collectiveProcessId", "fromTask"] as const;

export interface OriginalReportReturnTarget {
  documentTypeId: string;
  documentRequirementId?: string;
  documentName: string;
}

export interface OriginalReportReturnSession {
  processId: string;
  templateId: string;
  returnSearch: string;
  attachTarget: OriginalReportReturnTarget | null;
}

export interface ReportTemplateEditorExit {
  href: string;
  replace: boolean;
}

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

let replaySession: OriginalReportReturnSession | null = null;
let replayTimer: ReturnType<typeof setTimeout> | null = null;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isAttachTarget(value: unknown): value is OriginalReportReturnTarget {
  if (!value || typeof value !== "object") return false;
  const target = value as Record<string, unknown>;
  if (!isNonEmptyString(target.documentTypeId)) return false;
  if (!isNonEmptyString(target.documentName)) return false;
  if (
    target.documentRequirementId !== undefined &&
    typeof target.documentRequirementId !== "string"
  ) {
    return false;
  }
  return true;
}

function isSession(value: unknown): value is OriginalReportReturnSession {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.processId)) return false;
  if (!isNonEmptyString(record.templateId)) return false;
  if (typeof record.returnSearch !== "string") return false;
  if (record.attachTarget !== null && !isAttachTarget(record.attachTarget)) {
    return false;
  }
  return true;
}

export function normalizeAppPath(pathname: string): string {
  const withoutLocale = pathname.replace(/^\/(pt|en)(?=\/|$)/, "");
  return withoutLocale.length > 0 ? withoutLocale : "/";
}

export function captureProcessReturnSearch(search: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const kept = new URLSearchParams();
  for (const key of ALLOWED_RETURN_PARAMS) {
    const value = params.get(key);
    if (value) kept.set(key, value);
  }
  const serialized = kept.toString();
  return serialized ? `?${serialized}` : "";
}

export function readOriginalReportReturn(
  storage: Pick<Storage, "getItem"> | null,
): OriginalReportReturnSession | null {
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveOriginalReportReturn(
  session: OriginalReportReturnSession,
  storage: Pick<Storage, "setItem"> | null,
): void {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearOriginalReportReturn(
  storage: Pick<Storage, "removeItem"> | null,
): void {
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}

export function takeOriginalReportReturnForProcess(
  processId: string,
  storage: SessionStorageLike | null,
): OriginalReportReturnSession | null {
  const stored = readOriginalReportReturn(storage);
  if (stored?.processId === processId) {
    clearOriginalReportReturn(storage);
    replaySession = stored;
    if (replayTimer) clearTimeout(replayTimer);
    const timer = setTimeout(() => {
      replaySession = null;
      replayTimer = null;
    }, 0);
    if (typeof timer === "object" && "unref" in timer) {
      timer.unref();
    }
    replayTimer = timer;
    return stored;
  }
  if (replaySession?.processId === processId) {
    return replaySession;
  }
  return null;
}

export function shouldKeepOriginalReportReturn(
  pathname: string,
  session: OriginalReportReturnSession | null,
): boolean {
  if (!session) return false;
  const path = normalizeAppPath(pathname);
  if (path === `/report-templates/${session.templateId}/edit`) return true;
  if (path === `/individual-processes/${session.processId}`) return true;
  return false;
}

export function resolveReportTemplateEditorExit(
  templateId: string | undefined,
  storage: SessionStorageLike | null,
): ReportTemplateEditorExit {
  const session = readOriginalReportReturn(storage);
  if (session && templateId && session.templateId === templateId) {
    return {
      href: `/individual-processes/${session.processId}${session.returnSearch}`,
      replace: true,
    };
  }
  if (session) clearOriginalReportReturn(storage);
  return { href: "/report-templates", replace: false };
}

export function browserSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}
