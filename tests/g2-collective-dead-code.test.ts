import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const card = readFileSync(
  path.join(
    process.cwd(),
    "components/collective-processes/collective-process-detail-card.tsx",
  ),
  "utf8",
);

test("collective detail card has no dead cancel/complete/reopen mutation calls", () => {
  assert.doesNotMatch(card, /useMutation/);
  assert.doesNotMatch(card, /collectiveProcesses\.complete/);
  assert.doesNotMatch(card, /collectiveProcesses\.cancel/);
  assert.doesNotMatch(card, /collectiveProcesses\.reopen/);
  assert.doesNotMatch(card, /handleComplete/);
  assert.doesNotMatch(card, /handleCancel/);
  assert.doesNotMatch(card, /handleReopen/);
  assert.doesNotMatch(card, /completeDialogOpen/);
  assert.doesNotMatch(card, /TODO: Remove these/);
});
