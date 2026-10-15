import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function exportedHandler(fileSource: string, exportName: string): string {
  const marker = `export const ${exportName} =`;
  const start = fileSource.indexOf(marker);
  assert.ok(start >= 0, `missing export ${exportName}`);
  const next = fileSource.indexOf("\nexport const ", start + marker.length);
  return next === -1 ? fileSource.slice(start) : fileSource.slice(start, next);
}

test("companies.get accepts a string and normalizes the id", () => {
  const handler = exportedHandler(source("convex/companies.ts"), "get");
  assert.match(handler, /args: \{ id: v\.string\(\) \}/);
  assert.match(handler, /normalizeId\("companies", rawId\)/);
  assert.match(handler, /if \(!id\) return null/);
  assert.doesNotMatch(handler, /args: \{ id: v\.id\("companies"\) \}/);
});

test("company dashboard shows not-found when get returns null", () => {
  const page = source("components/companies/company-dashboard-page.tsx");
  assert.match(page, /company === null/);
  assert.match(page, /t\(['"]notFound['"]\)/);
});

test("process delete dialog uses the translated entity name", () => {
  const table = source(
    "components/individual-processes/individual-processes-table.tsx",
  );
  assert.match(table, /entityName:\s*t\("entityName"\)/);
  assert.match(table, /entityName=\{t\("entityName"\)\}/);
  assert.doesNotMatch(table, /entityName:\s*"individual process"/);
  assert.doesNotMatch(table, /entityName="individual process"/);

  const pt = JSON.parse(source("messages/pt.json")) as {
    IndividualProcesses: { entityName: string };
  };
  const en = JSON.parse(source("messages/en.json")) as {
    IndividualProcesses: { entityName: string };
  };
  assert.equal(pt.IndividualProcesses.entityName, "processo individual");
  assert.equal(en.IndividualProcesses.entityName, "individual process");
});
