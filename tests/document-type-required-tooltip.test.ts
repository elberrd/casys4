import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const associationSource = readFileSync(
  path.join(
    process.cwd(),
    "components/document-types/legal-framework-association-section.tsx",
  ),
  "utf8",
);
const pt = readFileSync(path.join(process.cwd(), "messages/pt.json"), "utf8");
const en = readFileSync(path.join(process.cwd(), "messages/en.json"), "utf8");

test("Obrigatório label has an explanatory tooltip", () => {
  assert.match(associationSource, /requiredTooltip/);
  assert.match(associationSource, /TooltipTrigger/);
  assert.match(associationSource, /<Info /);
  assert.match(pt, /"requiredTooltip":/);
  assert.match(en, /"requiredTooltip":/);
});
