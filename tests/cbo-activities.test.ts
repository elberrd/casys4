import assert from "node:assert/strict";
import test from "node:test";

import {
  cboActivityText,
  nextCboActivitiesOnSelection,
} from "../lib/cbo-activities";

test("reads trimmed CBO activity text", () => {
  assert.equal(cboActivityText({ activity: "  cortar mármore  " }), "cortar mármore");
  assert.equal(cboActivityText({ activity: "" }), "");
  assert.equal(cboActivityText({}), "");
  assert.equal(cboActivityText(null), "");
});

test("auto-fills process activities only when the field is empty", () => {
  assert.equal(
    nextCboActivitiesOnSelection({
      currentActivities: "",
      nextCboActivity: "i) Selecionar materiais",
    }),
    "i) Selecionar materiais",
  );
  assert.equal(
    nextCboActivitiesOnSelection({
      currentActivities: "texto customizado",
      nextCboActivity: "i) Selecionar materiais",
    }),
    null,
  );
  assert.equal(
    nextCboActivitiesOnSelection({
      currentActivities: "   ",
      nextCboActivity: "  ",
    }),
    null,
  );
});
