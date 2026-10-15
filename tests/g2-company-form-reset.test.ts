import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { EMPTY_QUERY_LIST, queryListOrEmpty } from "../lib/query-list";

const LIMIT = 50;

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function simulateLoadingFallback(
  fallback: (value: undefined) => unknown[],
): { updates: number; stable: boolean; last: unknown[] } {
  let last: unknown[] | undefined;
  let updates = 0;
  for (let i = 0; i < LIMIT; i++) {
    const next = fallback(undefined);
    if (last === undefined || next !== last) {
      last = next;
      updates += 1;
      continue;
    }
    return { updates, stable: true, last };
  }
  return { updates, stable: false, last: last ?? [] };
}

test("legacy ?? [] fallback never settles while a query is loading (React #185)", () => {
  const result = simulateLoadingFallback((value) => value ?? []);
  assert.equal(result.stable, false);
  assert.equal(result.updates, LIMIT);
});

test("queryListOrEmpty keeps the same array identity while loading", () => {
  const result = simulateLoadingFallback((value) => queryListOrEmpty(value));
  assert.equal(result.stable, true);
  assert.equal(result.updates, 1);
  assert.equal(result.last, EMPTY_QUERY_LIST);
});

test("queryListOrEmpty returns the loaded list when present", () => {
  const loaded = [{ _id: "g1" }];
  assert.equal(queryListOrEmpty(loaded), loaded);
});

test("company form dialog and page use the stable query list helper", () => {
  const dialog = source("components/companies/company-form-dialog.tsx");
  const page = source("components/companies/company-form-page.tsx");
  for (const src of [dialog, page]) {
    assert.match(src, /queryListOrEmpty/);
    assert.doesNotMatch(src, /listWithRelations, \{\}\) \?\? \[\]/);
    assert.doesNotMatch(src, /listActive, \{\}\) \?\? \[\]/);
  }
});
