import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  CBO_ACTIVITIES_COPY_FEEDBACK_MS,
  cboActivitiesClipboardText,
  cboActivityText,
  copyCurrentCboActivitiesToClipboard,
  nextCboActivitiesOnSelection,
} from "../lib/cbo-activities";

const fieldsSource = readFileSync(
  path.join(process.cwd(), "components/individual-processes/cbo-activities-fields.tsx"),
  "utf8",
);
const pt = readFileSync(path.join(process.cwd(), "messages/pt.json"), "utf8");
const en = readFileSync(path.join(process.cwd(), "messages/en.json"), "utf8");

const cboCodeSection = fieldsSource.slice(
  fieldsSource.indexOf('name="cboId"'),
  fieldsSource.indexOf('name="cboActivities"'),
);
const activitiesSection = fieldsSource.slice(
  fieldsSource.indexOf('name="cboActivities"'),
);

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

test("copies the current textarea value, not the original CBO occupation text", async () => {
  const written: string[] = [];
  const current = "texto editado no processo\ncom quebra";
  const result = await copyCurrentCboActivitiesToClipboard(current, async (text) => {
    written.push(text);
  });

  assert.equal(result, "copied");
  assert.deepEqual(written, [current]);
  assert.equal(cboActivitiesClipboardText(current), current);
  assert.equal(
    cboActivityText({ activity: "texto original do cadastro CBO" }),
    "texto original do cadastro CBO",
  );
  assert.notEqual(written[0], "texto original do cadastro CBO");
});

test("handles an empty textarea without calling the clipboard", async () => {
  let called = false;
  const writeText = async () => {
    called = true;
  };

  assert.equal(cboActivitiesClipboardText(""), null);
  assert.equal(cboActivitiesClipboardText("   "), null);
  assert.equal(cboActivitiesClipboardText(undefined), null);
  assert.equal(cboActivitiesClipboardText(null), null);
  assert.equal(await copyCurrentCboActivitiesToClipboard("", writeText), "empty");
  assert.equal(await copyCurrentCboActivitiesToClipboard("   ", writeText), "empty");
  assert.equal(await copyCurrentCboActivitiesToClipboard(undefined, writeText), "empty");
  assert.equal(called, false);
});

test("returns error when clipboard write fails without throwing", async () => {
  const result = await copyCurrentCboActivitiesToClipboard("abc", async () => {
    throw new Error("denied");
  });
  assert.equal(result, "error");
});

test("original Código CBO copy button still copies occupation text into the form", () => {
  assert.match(cboCodeSection, /copyFromSelectedCbo\(field\.value \|\| "", true\)/);
  assert.match(cboCodeSection, /aria-label=\{t\("copyCboActivities"\)\}/);
  assert.match(cboCodeSection, /title=\{t\("copyCboActivities"\)\}/);
  assert.doesNotMatch(cboCodeSection, /navigator\.clipboard/);
  assert.doesNotMatch(cboCodeSection, /copyCurrentCboActivitiesToClipboard/);
  assert.doesNotMatch(cboCodeSection, /copyCboActivitiesField/);
  assert.doesNotMatch(cboCodeSection, /copyCurrentActivities/);
});

test("Atividades CBO textarea has a copy button for the current form value", () => {
  assert.match(activitiesSection, /copyCurrentActivities\(field\.value/);
  assert.match(fieldsSource, /copyCurrentCboActivitiesToClipboard/);
  assert.match(fieldsSource, /CBO_ACTIVITIES_COPY_FEEDBACK_MS/);
  assert.match(activitiesSection, /type="button"/);
  assert.match(activitiesSection, /aria-label=\{t\("copyCboActivitiesField"\)\}/);
  assert.match(activitiesSection, /title=\{t\("copyCboActivitiesField"\)\}/);
  assert.match(activitiesSection, /disabled=\{!hasCurrentActivities\}/);
  assert.match(activitiesSection, /pr-10/);
  assert.match(activitiesSection, /pt-10/);
  assert.match(activitiesSection, /<Check /);
  assert.equal(CBO_ACTIVITIES_COPY_FEEDBACK_MS, 1500);
  assert.doesNotMatch(activitiesSection, /copyFromSelectedCbo/);
});

test("i18n keys exist for copying current CBO activities", () => {
  assert.match(pt, /"copyCboActivitiesField": "Copiar atividades CBO"/);
  assert.match(en, /"copyCboActivitiesField":/);
  assert.match(pt, /"cboActivitiesCopiedToClipboard":/);
  assert.match(en, /"cboActivitiesCopiedToClipboard":/);
  assert.match(pt, /"cboActivitiesNothingToCopy":/);
  assert.match(en, /"cboActivitiesNothingToCopy":/);
  assert.match(pt, /"copyCboActivities": "Copiar atividades do CBO"/);
  assert.match(en, /"copyCboActivities": "Copy CBO activities"/);
});
