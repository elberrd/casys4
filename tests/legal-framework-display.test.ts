import assert from "node:assert/strict";
import test from "node:test";

import {
  legalFrameworkLabel,
  resolveLegalFrameworkRef,
} from "../lib/legal-framework-display";

const COPY = {
  removedPt: "enquadramento removido",
  removedEn: "removed legal framework",
};

test("deleted documentTypesLegalFrameworks association is removed, not an error", () => {
  const resolved = resolveLegalFrameworkRef({
    associationId: "deleted_assoc_id",
    association: null,
    legalFramework: null,
  });
  assert.equal(resolved.removed, true);
  assert.equal(resolved.name, null);
  assert.equal(
    legalFrameworkLabel(resolved, { removed: COPY.removedPt }),
    "enquadramento removido",
  );
  assert.equal(
    legalFrameworkLabel(resolved, { removed: COPY.removedEn }),
    "removed legal framework",
  );
});

test("association whose legalFrameworks row is gone is also removed", () => {
  const resolved = resolveLegalFrameworkRef({
    associationId: "assoc_id",
    association: { legalFrameworkId: "missing_framework" },
    legalFramework: null,
  });
  assert.equal(resolved.removed, true);
  assert.equal(legalFrameworkLabel(resolved, { removed: COPY.removedPt }), COPY.removedPt);
});

test("blank legal framework name is treated as removed", () => {
  const resolved = resolveLegalFrameworkRef({
    associationId: "assoc_id",
    association: { legalFrameworkId: "lf" },
    legalFramework: { name: "  " },
  });
  assert.equal(resolved.removed, true);
});

test("documents without an association are not labeled removed", () => {
  const resolved = resolveLegalFrameworkRef({
    associationId: undefined,
    association: null,
    legalFramework: null,
  });
  assert.equal(resolved.removed, false);
  assert.equal(legalFrameworkLabel(resolved, { removed: COPY.removedPt }), null);
});

test("a live association still shows the framework name", () => {
  const resolved = resolveLegalFrameworkRef({
    associationId: "assoc_id",
    association: { legalFrameworkId: "lf" },
    legalFramework: { name: "RN 01/2017" },
  });
  assert.equal(resolved.removed, false);
  assert.equal(
    legalFrameworkLabel(resolved, { removed: COPY.removedPt }),
    "RN 01/2017",
  );
});
