import { Doc, Id, TableNames } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

/**
 * Per-execution memoized ctx.db.get.
 *
 * List queries that enrich N rows end up fetching the same related documents
 * (company, legal framework, case status, country, ...) once per row. Within a
 * single query execution the database snapshot is immutable, so repeated gets
 * of the same id always return identical data — caching the promise dedupes
 * those reads without changing results.
 */
export function createCachedGet(db: QueryCtx["db"]) {
  const cache = new Map<string, Promise<unknown>>();
  return function cachedGet<T extends TableNames>(
    id: Id<T>
  ): Promise<Doc<T> | null> {
    let hit = cache.get(id);
    if (!hit) {
      hit = db.get(id);
      cache.set(id, hit);
    }
    return hit as Promise<Doc<T> | null>;
  };
}
