import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const selectorSource = readFileSync(
  path.join(process.cwd(), "components/individual-processes/passport-selector.tsx"),
  "utf8",
);
const dialogSource = readFileSync(
  path.join(
    process.cwd(),
    "components/individual-processes/link-passport-dialog.tsx",
  ),
  "utf8",
);

test("PassportSelector keeps a single PassportFormDialog mounted", () => {
  const dialogOpens = selectorSource.match(/<PassportFormDialog/g) ?? [];
  assert.equal(
    dialogOpens.length,
    1,
    "Rendering PassportFormDialog in both empty and list branches remounts an empty create modal after the first passport is saved",
  );
});

test("LinkPassportDialog auto-links a newly created passport and closes", () => {
  assert.match(dialogSource, /onCreated=\{handlePassportCreated\}/);
  assert.match(dialogSource, /void linkPassportToProcess\(passportId\)/);
  assert.match(dialogSource, /onOpenChange\(false\)/);
});
