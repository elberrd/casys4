import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  REPORT_PDF_IMAGE_COMPRESSION,
  REPORT_PDF_IMAGE_FORMAT,
  REPORT_PDF_JPEG_QUALITY,
  pdfPageSlicesForCanvas,
} from "../lib/report-templates/html-to-pdf";
import { REPORT_PAGE_HEIGHT_MM, REPORT_PAGE_WIDTH_MM } from "../lib/report-templates/page-layout";

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("people delete uses the table confirmation dialog only once", () => {
  const client = readSource("app/[locale]/(dashboard)/people/people-client.tsx");
  const table = readSource("components/people/people-table.tsx");

  assert.equal(client.includes("confirm("), false);
  assert.equal(client.includes("deleteConfirm"), false);
  assert.match(client, /await deletePerson\(\{ id \}\)/);
  assert.match(table, /DeleteConfirmationDialog/);
  assert.match(table, /deleteConfirmation\.confirmDelete/);
});

test("export date pickers use locale and close the popover on select", () => {
  const source = readSource("components/ui/export-data-dialog.tsx");
  assert.match(source, /from "date-fns\/locale"/);
  assert.match(source, /locale === "pt" \? ptBR : enUS/);
  assert.match(source, /locale=\{dateLocale\}/);
  assert.match(source, /format\(value, "PPP", \{ locale: dateLocale \}\)/);
  assert.match(source, /<Popover open=\{open\} onOpenChange=\{setOpen\}>/);
  assert.match(source, /if \(date\) setOpen\(false\)/);
  assert.equal(source.includes("initialFocus"), false);
});

test("report PDF uses JPEG slices with compression instead of a full PNG per page", () => {
  const source = readSource("lib/report-templates/html-to-pdf.ts");
  assert.equal(REPORT_PDF_IMAGE_FORMAT, "JPEG");
  assert.equal(REPORT_PDF_JPEG_QUALITY, 0.85);
  assert.equal(REPORT_PDF_IMAGE_COMPRESSION, "FAST");
  assert.match(source, /toDataURL\("image\/jpeg", REPORT_PDF_JPEG_QUALITY\)/);
  assert.match(source, /compress: true/);
  assert.match(source, /pdfPageSlicesForCanvas/);
  assert.equal(source.includes('toDataURL("image/png")'), false);
  assert.equal(source.includes('"PNG"'), false);
});

test("pdfPageSlicesForCanvas covers a one-page canvas with a single slice", () => {
  const widthPx = 794;
  const heightPx = 800;
  const slices = pdfPageSlicesForCanvas(
    widthPx,
    heightPx,
    REPORT_PAGE_WIDTH_MM,
    REPORT_PAGE_HEIGHT_MM,
  );
  assert.equal(slices.length, 1);
  assert.equal(slices[0]?.sourceY, 0);
  assert.equal(slices[0]?.sliceHeight, heightPx);
});

test("pdfPageSlicesForCanvas splits a tall canvas into page-sized crops that cover every pixel", () => {
  const widthPx = 794;
  const heightPx = 3200;
  const slices = pdfPageSlicesForCanvas(
    widthPx,
    heightPx,
    REPORT_PAGE_WIDTH_MM,
    REPORT_PAGE_HEIGHT_MM,
  );
  assert.ok(slices.length >= 2);
  assert.equal(slices[0]?.sourceY, 0);
  const last = slices[slices.length - 1];
  assert.ok(last);
  assert.equal(last.sourceY + last.sliceHeight, heightPx);
  for (let i = 1; i < slices.length; i++) {
    const prev = slices[i - 1];
    const current = slices[i];
    assert.ok(prev && current);
    assert.equal(current.sourceY, prev.sourceY + prev.sliceHeight);
  }
});

test("dac73 version-hint remains gated on attachTarget plus replacingExisting", () => {
  const source = readSource(
    "components/process-reports/custom-report-generate-dialog.tsx",
  );
  assert.match(source, /saveAwaitingSignatureVersionHint/);
  assert.match(source, /attachTarget \? \(/);
  assert.match(source, /replacingExisting/);
});
