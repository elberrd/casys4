import assert from "node:assert/strict";
import test from "node:test";

import { getSchema } from "@tiptap/core";
import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";

import {
  ReportVariable,
  findReportVariablesInRange,
  findSelectedReportVariable,
  syncChipFormatAttrsFromMarks,
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

test("finds a personName chip when the cursor is after the atom", () => {
  const schema = getSchema([
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    ReportVariable,
  ]);
  const variable = schema.node("reportVariable", {
    key: "personName",
    label: "Nome do indivíduo",
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  });
  const paragraph = schema.node("paragraph", null, [
    variable,
    schema.text(" DECLARAÇÃO"),
  ]);
  const doc = schema.node("doc", null, [paragraph]);
  const state = EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc as never, 2),
  } as never);
  const found = findSelectedReportVariable(state);
  assert.ok(found);
  assert.equal(found.node.attrs.key, "personName");
  assert.equal(found.pos, 1);
});

test("serializes chip bold as data-bold=true on the span", () => {
  const schema = getSchema([
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    ReportVariable,
  ]);
  const node = schema.node("reportVariable", {
    key: "personName",
    label: "Nome do indivíduo",
    bold: true,
    italic: false,
    underline: false,
    strike: false,
  });
  const toDOM = schema.nodes.reportVariable?.spec.toDOM;
  assert.ok(toDOM);
  const spec = toDOM(node);
  assert.ok(Array.isArray(spec));
  const attrs = spec[1] as Record<string, string>;
  assert.equal(attrs["data-type"], "report-variable");
  assert.equal(attrs["data-bold"], "true");
  assert.equal(attrs["data-key"], "personName");
});

test("copies a wrapping bold mark onto data-bold so the chip persists", () => {
  const state = createState({ bold: false, withBoldMark: true });
  const found = findSelectedReportVariable(state);
  assert.ok(found);
  assert.equal(found.node.attrs.bold, false);
  const tr = syncChipFormatAttrsFromMarks(state);
  assert.ok(tr);
  const next = state.apply(tr);
  const nextNode = next.doc.nodeAt(found.pos);
  assert.ok(nextNode);
  assert.equal(nextNode.attrs.bold, true);
});

test("finds a personName chip covered by a text selection", () => {
  const base = createState({ bold: true });
  const pos = 1;
  const node = base.doc.nodeAt(pos);
  assert.ok(node);
  const state = EditorState.create({
    schema: base.schema,
    doc: base.doc,
    selection: TextSelection.create(base.doc as never, pos, pos + node.nodeSize),
  } as never);
  const inRange = findReportVariablesInRange(state, pos, pos + node.nodeSize);
  assert.equal(inRange.length, 1);
  assert.equal(inRange[0]?.node.attrs.key, "personName");
  const found = findSelectedReportVariable(state);
  assert.ok(found);
  assert.equal(found.node.attrs.key, "personName");
});
