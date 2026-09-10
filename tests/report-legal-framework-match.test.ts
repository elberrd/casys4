import assert from "node:assert/strict";
import test from "node:test";

import { reportTemplateMatchesProcessLegalFramework } from "../lib/report-templates/legal-framework-match";

test("generic reports (no legal framework) are available on every process", () => {
  assert.equal(
    reportTemplateMatchesProcessLegalFramework(undefined, undefined),
    true,
  );
  assert.equal(
    reportTemplateMatchesProcessLegalFramework(undefined, "framework-a"),
    true,
  );
});

test("a report with a legal framework only matches the same process framework", () => {
  assert.equal(
    reportTemplateMatchesProcessLegalFramework("framework-a", "framework-a"),
    true,
  );
  assert.equal(
    reportTemplateMatchesProcessLegalFramework("framework-a", "framework-b"),
    false,
  );
  assert.equal(
    reportTemplateMatchesProcessLegalFramework("framework-a", undefined),
    false,
  );
});
