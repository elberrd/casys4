import assert from "node:assert/strict";
import test from "node:test";

import { Fragment as DirectFragment } from "prosemirror-model";
import { Fragment as TiptapFragment } from "@tiptap/pm/model";
import {
  isReportEditorEnterEvent,
  isReportEditorTabEvent,
  shouldStopReportEditorKeyPropagation,
} from "../components/report-templates/report-enter-extension";
import {
  preserveReportEmptyBlocks,
  preserveReportHtmlWhitespace,
  preserveReportTextWhitespace,
  reportDocumentCss,
} from "../lib/report-templates/page-layout";
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

test("Enter is treated as an editor key unless a modifier is held", () => {
  assert.equal(isReportEditorEnterEvent({ key: "Enter" }), true);
  assert.equal(isReportEditorEnterEvent({ key: "Enter", ctrlKey: true }), false);
  assert.equal(isReportEditorEnterEvent({ key: "Enter", metaKey: true }), false);
  assert.equal(isReportEditorEnterEvent({ key: "Enter", altKey: true }), false);
  assert.equal(isReportEditorEnterEvent({ key: "Tab" }), false);
});

test("report document CSS keeps typed spaces, tabs, and line breaks", () => {
  const css = reportDocumentCss(".report-page-editor");
  assert.match(css, /white-space:\s*pre-wrap\s*!important/);
  assert.match(css, /tab-size:\s*4/);
  assert.match(css, /\.report-page-editor p/);
  assert.match(buildIsolatedReportHtml("<p>a  b</p>"), /white-space:\s*pre-wrap\s*!important/);
});

test("preview HTML converts consecutive spaces and tabs so they survive collapse", () => {
  const preserved = preserveReportHtmlWhitespace("<p>A    B\tC</p>");
  assert.equal(preserved.includes("A B"), false);
  assert.match(preserved, /A\u00a0\u00a0\u00a0\u00a0B/);
  assert.match(preserved, /B\u00a0\u00a0\u00a0\u00a0C/);
  assert.equal(preserveReportTextWhitespace("A    B"), "A\u00a0\u00a0\u00a0\u00a0B");
  const pdfHtml = buildIsolatedReportHtml("<p>hello  world</p>");
  assert.match(pdfHtml, /hello\u00a0\u00a0world/);
});

test("preview HTML keeps empty paragraphs so blank lines do not collapse", () => {
  assert.equal(preserveReportEmptyBlocks("<p></p>"), "<p>\u00a0</p>");
  assert.equal(preserveReportEmptyBlocks("<p><br></p>"), "<p>\u00a0</p>");
  assert.equal(
    preserveReportEmptyBlocks('<p><br class="ProseMirror-trailingBreak"></p>'),
    "<p>\u00a0</p>",
  );
  const preserved = preserveReportHtmlWhitespace(
    '<p>R1_NEWLINE</p><p></p><p><br></p><p>R2_CHECK</p>',
  );
  assert.equal(
    preserved,
    "<p>R1_NEWLINE</p><p>\u00a0</p><p>\u00a0</p><p>R2_CHECK</p>",
  );
  const css = reportDocumentCss(".report-paper-preview");
  assert.match(css, /p:empty/);
  assert.match(css, /min-height:\s*1\.6em/);
  const pdfHtml = buildIsolatedReportHtml("<p>before</p><p></p><p>after</p>");
  assert.match(pdfHtml, /<p>before<\/p><p>\u00a0<\/p><p>after<\/p>/);
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
