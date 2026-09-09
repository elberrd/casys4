import assert from "node:assert/strict";
import test from "node:test";

import { getSchema } from "@tiptap/core";
import { EditorState, NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";

import {
  ReportVariable,
  findSelectedReportVariable,
  variableHasFormat,
} from "../components/report-templates/report-variable-extension";

function createState(attrs: {
  bold?: boolean;
  italic?: boolean;
  withBoldMark?: boolean;
}) {
  const schema = getSchema([
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    ReportVariable,
  ]);
  const marks = attrs.withBoldMark ? [schema.marks.bold.create()] : [];
  const variable = schema.node(
    "reportVariable",
    {
      key: "personName",
      label: "Nome do indivíduo",
      bold: attrs.bold ?? false,
      italic: attrs.italic ?? false,
      underline: false,
      strike: false,
    },
    undefined,
    marks,
  );
  const paragraph = schema.node("paragraph", null, [variable]);
  const doc = schema.node("doc", null, [paragraph]);
  return EditorState.create({
    schema,
    doc,
    selection: NodeSelection.create(doc as never, 1),
  } as never);
}

test("finds a selected report variable chip", () => {
  const state = createState({ bold: true });
  const found = findSelectedReportVariable(state);
  assert.ok(found);
  assert.equal(found.node.attrs.key, "personName");
  assert.equal(found.pos, 1);
});

test("treats data-bold as an active format on the selected chip", () => {
  const state = createState({ bold: true });
  const found = findSelectedReportVariable(state);
  assert.ok(found);
  assert.equal(variableHasFormat(state, found.node, found.pos, "bold"), true);
  assert.equal(variableHasFormat(state, found.node, found.pos, "italic"), false);
});

test("treats a wrapping bold mark as an active format even without data-bold", () => {
  const state = createState({ bold: false, withBoldMark: true });
  const found = findSelectedReportVariable(state);
  assert.ok(found);
  assert.equal(found.node.attrs.bold, false);
  assert.equal(variableHasFormat(state, found.node, found.pos, "bold"), true);
});

test("can turn bold off by clearing the attr and the wrapping mark", () => {
  const state = createState({ bold: true, withBoldMark: true });
  const found = findSelectedReportVariable(state);
  assert.ok(found);
  const markType = state.schema.marks.bold;
  assert.ok(markType);
  const end = found.pos + found.node.nodeSize;
  const tr = state.tr
    .setNodeMarkup(found.pos, undefined, {
      ...found.node.attrs,
      bold: false,
    })
    .removeMark(found.pos, end, markType);
  const next = state.apply(tr);
  const nextNode = next.doc.nodeAt(found.pos);
  assert.ok(nextNode);
  assert.equal(nextNode.attrs.bold, false);
  assert.equal(variableHasFormat(next, nextNode, found.pos, "bold"), false);
});
