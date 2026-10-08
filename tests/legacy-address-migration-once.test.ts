import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  legacyAddressMigrationAction,
  shouldRunLegacyMigrationOnce,
} from "../lib/utils/legacy-address-migration";

test("ensureLegacyMigrated client guard runs at most once per process id", () => {
  const processId = "ms7cm6e4mhk1zs25ed2ke83qzx8dq798";
  let lastAttempted: string | null = null;
  let calls = 0;

  for (let i = 0; i < 57; i++) {
    if (!shouldRunLegacyMigrationOnce(processId, lastAttempted)) continue;
    lastAttempted = processId;
    calls += 1;
  }

  assert.equal(calls, 1);
  assert.equal(shouldRunLegacyMigrationOnce(processId, lastAttempted), false);
  assert.equal(
    shouldRunLegacyMigrationOnce("ms713bjza8hgxz76a8ekevkhhx8bz6hz", lastAttempted),
    true,
  );
});

test("server skips a write when there is nothing to migrate", () => {
  assert.equal(
    legacyAddressMigrationAction({
      existingCount: 0,
      onlyAddressIsCurrent: null,
      processHasSubstantiveBrazilAddress: false,
    }),
    "none",
  );
  assert.equal(
    legacyAddressMigrationAction({
      existingCount: 1,
      onlyAddressIsCurrent: true,
      processHasSubstantiveBrazilAddress: true,
    }),
    "none",
  );
  assert.equal(
    legacyAddressMigrationAction({
      existingCount: 2,
      onlyAddressIsCurrent: null,
      processHasSubstantiveBrazilAddress: true,
    }),
    "none",
  );
});

test("address table guards ensureLegacyMigrated with a per-process ref", () => {
  const table = readFileSync(
    path.join(
      process.cwd(),
      "components/individual-processes/individual-process-addresses-table.tsx",
    ),
    "utf8",
  );
  const mutation = readFileSync(
    path.join(process.cwd(), "convex/individualProcessAddresses.ts"),
    "utf8",
  );
  assert.match(table, /shouldRunLegacyMigrationOnce/);
  assert.match(table, /attemptedMigrationProcessIdRef/);
  assert.match(mutation, /legacyAddressMigrationAction/);
  assert.match(mutation, /if \(action === "none"\)/);
});

test("server still migrates a single non-current row or a substantive Brazil snapshot", () => {
  assert.equal(
    legacyAddressMigrationAction({
      existingCount: 1,
      onlyAddressIsCurrent: false,
      processHasSubstantiveBrazilAddress: true,
    }),
    "mark-current",
  );
  assert.equal(
    legacyAddressMigrationAction({
      existingCount: 0,
      onlyAddressIsCurrent: null,
      processHasSubstantiveBrazilAddress: true,
    }),
    "insert",
  );
});
