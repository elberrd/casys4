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
import {
  pickLatestReportContent,
  reportFilenameFromDocument,
  resolveProcessReportEditorContent,
  shouldPersistProcessReportEdit,
  uploadDocumentKeepingHtmlFallback,
} from "../lib/report-templates/process-report-edit";

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

test("Enter paragraphs use Word-like single spacing in editor, preview, and PDF CSS", () => {
  const editorCss = reportDocumentCss(".report-page-editor");
  const previewCss = reportDocumentCss(".report-paper-preview");
  const pdfHtml = buildIsolatedReportHtml("<p>linha 1</p><p>linha 2</p>");
  assert.match(editorCss, /\.report-page-editor p \{ margin: 0; \}/);
  assert.match(previewCss, /\.report-paper-preview p \{ margin: 0; \}/);
  assert.match(pdfHtml, /#report-paper p \{ margin: 0; \}/);
  assert.equal(/p \{ margin: 0 0 0\.75em/.test(editorCss), false);
  assert.equal(/p \{ margin: 0 0 0\.75em/.test(previewCss), false);
  assert.equal(/p \{ margin: 0 0 0\.75em/.test(pdfHtml), false);
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

test("reopen prefers an unsaved draft over the last approved version HTML", () => {
  const resolved = resolveProcessReportEditorContent({
    saved: { contentHtml: "<p>rascunho</p>", filename: "draft" },
    attached: { contentHtml: "<p>aprovado</p>", filename: "v2" },
    templateHtml: "<p>modelo</p>",
    templateName: "Declaração",
    values: { personName: "Ada Lovelace" },
    todayIso: "2026-09-21",
  });
  assert.equal(resolved.html, "<p>rascunho</p>");
  assert.equal(resolved.fromSavedEdit, true);
});

test("reopen loads the last approved version HTML when there is no draft", () => {
  const resolved = resolveProcessReportEditorContent({
    saved: null,
    attached: { contentHtml: "<p>correção salva</p>", filename: "v3" },
    templateHtml: "<p>modelo</p>",
    templateName: "Declaração",
    values: { personName: "Ada Lovelace" },
    todayIso: "2026-09-21",
  });
  assert.equal(resolved.html, "<p>correção salva</p>");
  assert.equal(resolved.filename, "v3");
  assert.equal(resolved.fromSavedEdit, true);
});

test("pickLatestReportContent does not reuse HTML from another document type", () => {
  const picked = pickLatestReportContent(
    [
      {
        contentHtml: "<p>other</p>",
        fileName: "other.pdf",
        version: 9,
        reportTemplateId: "other-tpl",
        documentTypeId: "other-type",
      },
    ],
    { reportTemplateId: "tpl" },
  );
  assert.equal(picked, null);
});

test("pickLatestReportContent uses the highest version with HTML for that template", () => {
  const picked = pickLatestReportContent(
    [
      {
        contentHtml: "<p>v1</p>",
        fileName: "relatorio-v1.pdf",
        version: 1,
        reportTemplateId: "tpl",
        documentTypeId: "type",
      },
      {
        contentHtml: "<p>v3</p>",
        fileName: "relatorio-v3.pdf",
        version: 3,
        reportTemplateId: "tpl",
        documentTypeId: "type",
      },
      {
        fileName: "upload.pdf",
        version: 4,
        documentTypeId: "type",
      },
    ],
    { reportTemplateId: "tpl", documentTypeId: "type" },
  );
  assert.equal(picked?.contentHtml, "<p>v3</p>");
  assert.equal(reportFilenameFromDocument(picked?.fileName ?? ""), "relatorio-v3");
});

test("upload keeps going without HTML fields when the server rejects them", async () => {
  const calls: unknown[] = [];
  const upload = async (args: { fileName: string; contentHtml?: string }) => {
    calls.push(args);
    if (args.contentHtml) {
      throw new Error("ArgumentValidationError");
    }
    return "ok";
  };
  const result = await uploadDocumentKeepingHtmlFallback(upload, {
    fileName: "a.pdf",
    contentHtml: "<p>x</p>",
    reportTemplateId: "tpl",
  });
  assert.equal(result, "ok");
  assert.equal(calls.length, 2);
  assert.equal(
    (calls[1] as { contentHtml?: string }).contentHtml,
    undefined,
  );
});

test("docx keeps consecutive spaces from the editor instead of trimming them", async () => {
  const blob = await htmlToDocxBlob("<p>hello  world</p>");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml);
  assert.match(xml ?? "", /hello {2}world/);
});

test("docx Enter paragraphs have no extra space after unless the HTML set a margin", async () => {
  const tight = await htmlToDocxBlob("<p>linha 1</p><p>linha 2</p>");
  const tightZip = await JSZip.loadAsync(await tight.arrayBuffer());
  const tightXml = await tightZip.file("word/document.xml")?.async("string");
  assert.ok(tightXml);
  assert.match(tightXml ?? "", /w:after="0"/);
  assert.equal(/w:after="160"/.test(tightXml ?? ""), false);

  const spaced = await htmlToDocxBlob(
    '<p style="margin-bottom: 2em">bloco</p><p>seguinte</p>',
  );
  const spacedZip = await JSZip.loadAsync(await spaced.arrayBuffer());
  const spacedXml = await spacedZip.file("word/document.xml")?.async("string");
  assert.ok(spacedXml);
  assert.match(spacedXml ?? "", /w:after="[1-9]\d+"/);
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
