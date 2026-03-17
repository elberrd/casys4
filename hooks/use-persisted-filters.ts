const STORAGE_KEY = "ip-filter-state"

export function loadPersistedFilters(): Record<string, any> | null {
  try {
    if (typeof window === "undefined") return null
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function persistFilters(criteria: Record<string, any>): void {
  try {
    if (typeof window === "undefined") return
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(criteria))
  } catch {
    // Silently fail if sessionStorage is unavailable
  }
}

export function clearPersistedFilters(): void {
  try {
    if (typeof window === "undefined") return
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Silently fail if sessionStorage is unavailable
  }
}
