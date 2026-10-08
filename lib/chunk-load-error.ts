export const CHUNK_LOAD_RELOAD_KEY = "casys4:chunk-load-reload";

export function isChunkLoadError(error: unknown): boolean {
  if (error == null) return false;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    name === "ChunkLoadError" ||
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Failed to load chunk") ||
    message.includes("error loading dynamically imported module")
  );
}

type WebStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Returns true when the caller should reload the page. The second consecutive
 * chunk-load failure returns false so a missing/broken chunk cannot loop.
 */
export function shouldReloadOnceForChunkError(storage: WebStorage): boolean {
  if (storage.getItem(CHUNK_LOAD_RELOAD_KEY) === "1") {
    return false;
  }
  storage.setItem(CHUNK_LOAD_RELOAD_KEY, "1");
  return true;
}

export function clearChunkLoadReloadFlag(storage: WebStorage): void {
  storage.removeItem(CHUNK_LOAD_RELOAD_KEY);
}
