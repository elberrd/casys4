import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  canBeConvexDocumentId,
  individualProcessGetArgs,
} from "../lib/convex-document-id";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("malformed URL ids are skipped instead of being sent to v.id", () => {
  assert.equal(canBeConvexDocumentId("not-a-real-id"), false);
  assert.equal(canBeConvexDocumentId(""), false);
  assert.equal(canBeConvexDocumentId("  "), false);
  assert.equal(canBeConvexDocumentId("abc/def"), false);
  assert.equal(individualProcessGetArgs("not-a-real-id"), "skip");
  assert.equal(individualProcessGetArgs(""), "skip");
});

test("convex-looking ids are passed through to get", () => {
  const id = "k57d9c8h0q3m4n2p6r1s7t8u9v0w1x2y";
  assert.equal(canBeConvexDocumentId(id), true);
  assert.deepEqual(individualProcessGetArgs(` ${id} `), { id });
});

test("detail page skips get for invalid ids and shows not-found", () => {
  const client = source(
    "app/[locale]/(dashboard)/individual-processes/[id]/individual-process-detail-client.tsx",
  );
  assert.match(client, /processIdInvalid \? "skip" : \{ id: processId \}/);
  assert.match(client, /processIdInvalid \|\| individualProcess === null/);
  assert.match(client, /t\("notFound"\)/);
});

test("individualProcesses.get accepts a string and normalizes the id", () => {
  const backend = source("convex/individualProcesses.ts");
  const getIndex = backend.indexOf("export const get = query({");
  assert.ok(getIndex >= 0);
  const snippet = backend.slice(getIndex, getIndex + 900);
  assert.match(snippet, /args: \{ id: v\.string\(\) \}/);
  assert.match(snippet, /normalizeId\("individualProcesses", rawId\)/);
  assert.match(snippet, /if \(!id\) return null/);
});
