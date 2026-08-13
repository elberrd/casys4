import assert from "node:assert/strict";
import test from "node:test";

import type { Doc, Id } from "../convex/_generated/dataModel";
import {
  getManualExigenciaStatusId,
  selectLatestVersionsByExigenciaOccurrence,
} from "../convex/lib/exigenciaDocumentVersions";

const firstExigenciaId =
  "status_exigencia_1" as Id<"individualProcessStatuses">;
const secondExigenciaId =
  "status_exigencia_2" as Id<"individualProcessStatuses">;
const nonExigenciaStatusId =
  "status_em_preparacao" as Id<"individualProcessStatuses">;
const exigenciaOccurrences = new Map([
  [
    firstExigenciaId,
    { date: "2026-03-13T12:27", changedAt: 100 },
  ],
  [
    secondExigenciaId,
    { date: "2026-08-11T17:00", changedAt: 200 },
  ],
]);

function documentVersion({
  id,
  version,
  uploadedAt,
  manualStatusId,
  snapshotStatusId,
  frameworkId,
}: {
  id: string;
  version: number;
  uploadedAt: number;
  manualStatusId?: Id<"individualProcessStatuses">;
  snapshotStatusId?: Id<"individualProcessStatuses">;
  frameworkId?: Id<"documentTypesLegalFrameworks">;
}): Doc<"documentsDelivered"> {
  return {
    _id: id as Id<"documentsDelivered">,
    _creationTime: uploadedAt,
    individualProcessId: "process_1" as Id<"individualProcesses">,
    documentTypeId: "document_type_1" as Id<"documentTypes">,
    documentTypeLegalFrameworkId: frameworkId,
    fileName: `${id}.pdf`,
    fileUrl: `https://example.test/${id}.pdf`,
    fileSize: 100,
    mimeType: "application/pdf",
    status: "approved",
    uploadedBy: "user_1" as Id<"users">,
    uploadedAt,
    version,
    isLatest: version === 4,
    individualProcessStatusId: manualStatusId,
    processStatusAtUpload: snapshotStatusId
      ? {
          individualProcessStatusId: snapshotStatusId,
          name: "Exigência",
          code: "exigencia",
        }
      : undefined,
  } as Doc<"documentsDelivered">;
}

test("does not treat the active progress snapshot as a manual Exigencia link", () => {
  const uploadedDuringExigencia = documentVersion({
    id: "ordinary_version_3",
    version: 3,
    uploadedAt: 300,
    snapshotStatusId: secondExigenciaId,
  });

  assert.equal(
    getManualExigenciaStatusId(
      uploadedDuringExigencia,
      exigenciaOccurrences,
    ),
    undefined,
  );
  assert.deepEqual(
    selectLatestVersionsByExigenciaOccurrence(
      [uploadedDuringExigencia],
      exigenciaOccurrences,
    ),
    [],
  );
});

test("shows a document only in its most recent manual Exigencia occurrence", () => {
  const firstOccurrenceV1 = documentVersion({
    id: "first_occurrence_v1",
    version: 1,
    uploadedAt: 100,
    manualStatusId: firstExigenciaId,
    frameworkId:
      "legacy_framework" as Id<"documentTypesLegalFrameworks">,
  });
  const firstOccurrenceV2 = documentVersion({
    id: "first_occurrence_v2",
    version: 2,
    uploadedAt: 200,
    manualStatusId: firstExigenciaId,
    frameworkId:
      "legacy_framework" as Id<"documentTypesLegalFrameworks">,
  });
  const secondOccurrenceV3 = documentVersion({
    id: "second_occurrence_v3",
    version: 3,
    uploadedAt: 300,
    manualStatusId: secondExigenciaId,
  });
  const linkedToAnotherProgress = documentVersion({
    id: "non_exigencia_v4",
    version: 4,
    uploadedAt: 400,
    manualStatusId: nonExigenciaStatusId,
    snapshotStatusId: secondExigenciaId,
  });

  const selected = selectLatestVersionsByExigenciaOccurrence(
    [
      firstOccurrenceV1,
      firstOccurrenceV2,
      secondOccurrenceV3,
      linkedToAnotherProgress,
    ],
    exigenciaOccurrences,
  );

  assert.deepEqual(
    selected.map((document) => document._id),
    [secondOccurrenceV3._id],
  );
});
