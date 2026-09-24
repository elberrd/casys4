import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  documentNewVersionSchema,
} from "../lib/validations/documents";
import {
  looseDocumentUploadSchema,
  pendingDocumentUploadSchema,
  typedDocumentUploadSchema,
} from "../lib/validations/documents-delivered";
import {
  OBSERVACOES_MAX_LENGTH,
  assertObservacoesMaxLength,
} from "../lib/validations/observacoes";

const atLimit = "a".repeat(OBSERVACOES_MAX_LENGTH);
const overLimit = "a".repeat(OBSERVACOES_MAX_LENGTH + 1);

const typedBase = {
  individualProcessId: "process-id",
  documentTypeId: "type-id",
  storageId: "storage-id",
  fileName: "file.pdf",
  fileSize: 1,
  mimeType: "application/pdf",
};

const looseBase = {
  individualProcessId: "process-id",
  storageId: "storage-id",
  fileName: "file.pdf",
  fileSize: 1,
  mimeType: "application/pdf",
};

const pendingBase = {
  documentId: "document-id",
  storageId: "storage-id",
  fileName: "file.pdf",
  fileSize: 1,
  mimeType: "application/pdf",
};

const standaloneBase = {
  storageId: "storage-id",
  fileName: "file.pdf",
  fileSize: 1,
  fileType: "application/pdf",
};

test("document Observações limit is 10× the previous 500-character cap", () => {
  assert.equal(OBSERVACOES_MAX_LENGTH, 5000);
});

test("Zod document-upload schemas accept Observações at the new limit", () => {
  assert.doesNotThrow(() =>
    typedDocumentUploadSchema.parse({ ...typedBase, versionNotes: atLimit }),
  );
  assert.doesNotThrow(() =>
    looseDocumentUploadSchema.parse({ ...looseBase, versionNotes: atLimit }),
  );
  assert.doesNotThrow(() =>
    pendingDocumentUploadSchema.parse({ ...pendingBase, versionNotes: atLimit }),
  );
  assert.doesNotThrow(() =>
    documentNewVersionSchema.parse({ ...standaloneBase, versionNotes: atLimit }),
  );
});

test("Zod document-upload schemas reject Observações above the new limit", () => {
  assert.throws(() =>
    typedDocumentUploadSchema.parse({ ...typedBase, versionNotes: overLimit }),
  );
  assert.throws(() =>
    looseDocumentUploadSchema.parse({ ...looseBase, versionNotes: overLimit }),
  );
  assert.throws(() =>
    pendingDocumentUploadSchema.parse({
      ...pendingBase,
      versionNotes: overLimit,
    }),
  );
  assert.throws(() =>
    documentNewVersionSchema.parse({
      ...standaloneBase,
      versionNotes: overLimit,
    }),
  );
});

test("backend helper matches the shared Observações limit", () => {
  assert.doesNotThrow(() => assertObservacoesMaxLength(undefined));
  assert.doesNotThrow(() => assertObservacoesMaxLength(atLimit));
  assert.throws(
    () => assertObservacoesMaxLength(overLimit),
    /at most 5000 characters/,
  );
});

test("all Observações (opcional) textareas use OBSERVACOES_MAX_LENGTH", () => {
  const files = [
    "components/individual-processes/document-upload-dialog.tsx",
    "components/individual-processes/typed-document-upload-dialog.tsx",
    "components/individual-processes/loose-document-upload-dialog.tsx",
    "components/individual-processes/pending-document-upload-dialog.tsx",
    "components/individual-processes/upload-new-version-dialog.tsx",
    "components/individual-processes/document-review-dialog.tsx",
    "components/documents/document-version-upload-dialog.tsx",
  ];

  for (const relativePath of files) {
    const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");
    assert.match(
      source,
      /import \{\s*OBSERVACOES_MAX_LENGTH\s*\} from "@\/lib\/validations\/observacoes"/,
      `${relativePath} must import OBSERVACOES_MAX_LENGTH`,
    );
    assert.match(
      source,
      /maxLength=\{OBSERVACOES_MAX_LENGTH\}/,
      `${relativePath} must bind versionNotes maxLength to OBSERVACOES_MAX_LENGTH`,
    );
    assert.doesNotMatch(
      source,
      /id="versionNotes"[\s\S]{0,400}maxLength=\{500\}/,
      `${relativePath} must not keep a hardcoded 500 limit on versionNotes`,
    );
  }
});
