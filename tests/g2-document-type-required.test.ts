import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { documentFormSchema, documentSchema } from "../lib/validations/documents";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const validBase = {
  name: "Passport copy",
};

test("document schema rejects an empty document type", () => {
  const empty = documentSchema.safeParse({ ...validBase, documentTypeId: "" });
  assert.equal(empty.success, false);
  const missing = documentSchema.safeParse({ ...validBase });
  assert.equal(missing.success, false);
});

test("document schema accepts a selected document type", () => {
  const parsed = documentSchema.safeParse({
    ...validBase,
    documentTypeId: "k57d9c8h0q3m4n2p",
  });
  assert.equal(parsed.success, true);
});

test("document form schema uses the translated required message", () => {
  const schema = documentFormSchema("Tipo de documento é obrigatório");
  const empty = schema.safeParse({ ...validBase, documentTypeId: "" });
  assert.equal(empty.success, false);
  if (!empty.success) {
    const documentTypeIssue = empty.error.issues.find(
      (issue) => issue.path[0] === "documentTypeId",
    );
    assert.equal(documentTypeIssue?.message, "Tipo de documento é obrigatório");
  }
});

test("document create/edit forms require a type and i18n keys exist", () => {
  const page = source("components/documents/document-form-page.tsx");
  const dialog = source("components/documents/document-form-dialog.tsx");
  const pt = source("messages/pt.json");
  const en = source("messages/en.json");
  for (const src of [page, dialog]) {
    assert.match(src, /documentFormSchema\(t\("documentTypeRequired"\)\)/);
    assert.match(src, /documentTypeRequired/);
  }
  assert.match(pt, /"documentTypeRequired": "Tipo de documento é obrigatório"/);
  assert.match(en, /"documentTypeRequired": "Document type is required"/);
});
