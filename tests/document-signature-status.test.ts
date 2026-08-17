import assert from "node:assert/strict";
import test from "node:test";

import {
  DOCUMENT_STATUS,
  isAwaitingSignature,
  requiresSignedVersionForTransition,
  resolveDocumentUploadStatus,
} from "../convex/lib/documentStatus";

test("marks a received draft as awaiting signature before approval", () => {
  assert.equal(
    resolveDocumentUploadStatus({
      hasFile: true,
      awaitingSignature: true,
      isIllegible: false,
      canAutoApprove: true,
    }),
    DOCUMENT_STATUS.awaitingSignature,
  );
});

test("completes a signed return when approval is selected", () => {
  assert.equal(
    resolveDocumentUploadStatus({
      hasFile: true,
      awaitingSignature: false,
      isIllegible: false,
      canAutoApprove: true,
    }),
    DOCUMENT_STATUS.approved,
  );
});

test("keeps a signed return as received when approval is not selected", () => {
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

test("does not create a signature state without a file", () => {
  assert.equal(
    resolveDocumentUploadStatus({
      hasFile: false,
      awaitingSignature: true,
      isIllegible: false,
      canAutoApprove: false,
    }),
    DOCUMENT_STATUS.notStarted,
  );
});

test("identifies only the signature waiting status", () => {
  assert.equal(isAwaitingSignature(DOCUMENT_STATUS.awaitingSignature), true);
  assert.equal(isAwaitingSignature(DOCUMENT_STATUS.uploaded), false);
});

test("requires a new version before continuing an awaiting-signature document", () => {
  assert.equal(
    requiresSignedVersionForTransition(
      DOCUMENT_STATUS.awaitingSignature,
      DOCUMENT_STATUS.approved,
    ),
    true,
  );
  assert.equal(
    requiresSignedVersionForTransition(
      DOCUMENT_STATUS.awaitingSignature,
      DOCUMENT_STATUS.uploaded,
    ),
    true,
  );
  assert.equal(
    requiresSignedVersionForTransition(
      DOCUMENT_STATUS.awaitingSignature,
      DOCUMENT_STATUS.rejected,
    ),
    false,
  );
  assert.equal(
    requiresSignedVersionForTransition(
      DOCUMENT_STATUS.uploaded,
      DOCUMENT_STATUS.approved,
    ),
    false,
  );
});
