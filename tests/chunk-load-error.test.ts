import assert from "node:assert/strict";
import test from "node:test";

import {
  CHUNK_LOAD_RELOAD_KEY,
  clearChunkLoadReloadFlag,
  isChunkLoadError,
  shouldReloadOnceForChunkError,
} from "../lib/chunk-load-error";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    key() {
      return null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

test("detects ChunkLoadError and Loading chunk messages", () => {
  const named = new Error("boom");
  named.name = "ChunkLoadError";
  assert.equal(isChunkLoadError(named), true);
  assert.equal(isChunkLoadError(new Error("Loading chunk 5 failed")), true);
  assert.equal(isChunkLoadError(new Error("Failed to load chunk")), true);
  assert.equal(isChunkLoadError(new Error("unrelated")), false);
});

test("auto-reloads a chunk failure only once per tab", () => {
  const storage = memoryStorage();
  assert.equal(shouldReloadOnceForChunkError(storage), true);
  assert.equal(storage.getItem(CHUNK_LOAD_RELOAD_KEY), "1");
  assert.equal(shouldReloadOnceForChunkError(storage), false);
  clearChunkLoadReloadFlag(storage);
  assert.equal(shouldReloadOnceForChunkError(storage), true);
});
