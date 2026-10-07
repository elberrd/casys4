import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  DOCUMENT_STATUS,
  requiresSignedVersionForTransition,
  resolveDocumentUploadStatus,
} from "../convex/lib/documentStatus";
import {
  reportAttachUploadStatusArgs,
  resolveReportAttachDocumentStatus,
} from "../lib/report-templates/process-report-edit";

test("adding a report sets awaiting_signature, not approved", () => {
  const flags = reportAttachUploadStatusArgs();
  assert.equal(flags.awaitingSignature, true);
  assert.equal("autoApprove" in flags, false);
  assert.equal(
    resolveReportAttachDocumentStatus(),
    DOCUMENT_STATUS.awaitingSignature,
  );
  assert.notEqual(
    resolveReportAttachDocumentStatus(),
    DOCUMENT_STATUS.approved,
  );
  assert.equal(
    resolveDocumentUploadStatus({
      hasFile: true,
      awaitingSignature: flags.awaitingSignature,
      isIllegible: false,
      canAutoApprove: false,
    }),
    DOCUMENT_STATUS.awaitingSignature,
  );
});

test("signature-flow transitions still work from the report-attach status", () => {
  const fromReport = resolveReportAttachDocumentStatus();
  assert.equal(fromReport, DOCUMENT_STATUS.awaitingSignature);

  assert.equal(
    requiresSignedVersionForTransition(fromReport, DOCUMENT_STATUS.approved),
    true,
  );
  assert.equal(
    requiresSignedVersionForTransition(fromReport, DOCUMENT_STATUS.uploaded),
    true,
  );
  assert.equal(
    requiresSignedVersionForTransition(fromReport, DOCUMENT_STATUS.rejected),
    false,
  );
  assert.equal(
    requiresSignedVersionForTransition(
      fromReport,
      DOCUMENT_STATUS.awaitingSignature,
    ),
    false,
  );

  assert.equal(
    resolveDocumentUploadStatus({
      hasFile: true,
      awaitingSignature: false,
      isIllegible: false,
      canAutoApprove: true,
    }),
    DOCUMENT_STATUS.approved,
  );
  assert.equal(
    resolveDocumentUploadStatus({
      hasFile: true,
      awaitingSignature: false,
      isIllegible: false,
      canAutoApprove: false,
    }),
    DOCUMENT_STATUS.uploaded,
  );
});

test("existing document statuses are not rewritten by the report-attach default", () => {
  const existingDocuments = [
    { id: "doc-approved", status: DOCUMENT_STATUS.approved },
    { id: "doc-uploaded", status: DOCUMENT_STATUS.uploaded },
    { id: "doc-review", status: DOCUMENT_STATUS.underReview },
  ];
  const snapshot = structuredClone(existingDocuments);

  const nextAttachStatus = resolveReportAttachDocumentStatus();

  assert.equal(nextAttachStatus, DOCUMENT_STATUS.awaitingSignature);
  assert.deepEqual(existingDocuments, snapshot);
  assert.equal(existingDocuments[0]?.status, DOCUMENT_STATUS.approved);
});

test("report attach dialog uses awaiting-signature flags instead of autoApprove", () => {
  const source = readFileSync(
    path.join(
      __dirname,
      "../components/process-reports/custom-report-generate-dialog.tsx",
    ),
    "utf8",
  );
  assert.match(source, /reportAttachUploadStatusArgs\(\)/);
  assert.doesNotMatch(source, /autoApprove:\s*true/);
});
