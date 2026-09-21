import assert from "node:assert/strict";
import test from "node:test";

import { Fragment as DirectFragment } from "prosemirror-model";
import { Fragment as TiptapFragment } from "@tiptap/pm/model";
import {
  isReportEditorTabEvent,
  shouldStopReportEditorKeyPropagation,
} from "../components/report-templates/report-enter-extension";
import { reportDocumentCss } from "../lib/report-templates/page-layout";
import { buildIsolatedReportHtml } from "../lib/report-templates/html-to-pdf";
import { htmlToDocxBlob } from "../lib/report-templates/html-to-docx";
import JSZip from "jszip";
import { resolveProcessReportEditorContent, shouldPersistProcessReportEdit } from "../lib/report-templates/process-report-edit";

test("prosemirror-model is a single copy so Enter can split blocks", () => {
  assert.equal(DirectFragment, TiptapFragment);
});

test("Tab and Enter inside the report editor must not bubble to a dialog", () => {
  assert.equal(shouldStopReportEditorKeyPropagation({ key: "Tab" }), true);
  assert.equal(shouldStopReportEditorKeyPropagation({ key: "Enter" }), true);
  assert.equal(shouldStopReportEditorKeyPropagation({ key: "a" }), false);
});

test("Tab is treated as an editor key unless a modifier is held", () => {
  assert.equal(isReportEditorTabEvent({ key: "Tab" }), true);
  assert.equal(isReportEditorTabEvent({ key: "Tab", ctrlKey: true }), false);
  assert.equal(isReportEditorTabEvent({ key: "Tab", metaKey: true }), false);
  assert.equal(isReportEditorTabEvent({ key: "Tab", altKey: true }), false);
  assert.equal(isReportEditorTabEvent({ key: "Enter" }), false);
});

test("report document CSS keeps typed spaces, tabs, and line breaks", () => {
  const css = reportDocumentCss(".report-page-editor");
  assert.match(css, /white-space:\s*pre-wrap/);
  assert.match(css, /tab-size:\s*4/);
  assert.match(buildIsolatedReportHtml("<p>a  b</p>"), /white-space:\s*pre-wrap/);
});

test("reopening a generated report loads the saved HTML instead of the template", () => {
  const resolved = resolveProcessReportEditorContent({
    saved: {
      contentHtml: "<p>correção do cliente</p>",
      filename: "declaracao-editada",
    },
    templateHtml: "<p>modelo original</p>",
    templateName: "Declaração",
    values: { personName: "Ada Lovelace" },
    todayIso: "2026-09-21",
  });

  assert.equal(resolved.fromSavedEdit, true);
  assert.equal(resolved.html, "<p>correção do cliente</p>");
  assert.equal(resolved.filename, "declaracao-editada");
});

test("first generation substitutes the template when no saved edit exists", () => {
  const resolved = resolveProcessReportEditorContent({
    saved: null,
    templateHtml: "<p>Relatório de Ada Lovelace</p>",
    templateName: "Relatório livre",
    values: { personName: "Ada Lovelace" },
    todayIso: "2026-09-21",
  });

  assert.equal(resolved.fromSavedEdit, false);
  assert.equal(resolved.html, "<p>Relatório de Ada Lovelace</p>");
  assert.equal(resolved.filename, "Relatório livre");
});

test("docx keeps consecutive spaces from the editor instead of trimming them", async () => {
  const blob = await htmlToDocxBlob("<p>hello  world</p>");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml);
  assert.match(xml ?? "", /hello {2}world/);
});

test("saved edits persist only when HTML or filename actually changed", () => {
  assert.equal(
    shouldPersistProcessReportEdit({
      html: "<p>a</p>",
      filename: "a",
      lastPersistedHtml: "<p>a</p>",
      lastPersistedFilename: "a",
    }),
    false,
  );
  assert.equal(
    shouldPersistProcessReportEdit({
      html: "<p>a</p><p></p>",
      filename: "a",
      lastPersistedHtml: "<p>a</p>",
      lastPersistedFilename: "a",
    }),
    true,
  );
});
