import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReportAttachOptions,
  findProcessDocumentForReportAttach,
  formatLinkedDocumentTypeNames,
  reportsForDocumentType,
} from "../lib/report-templates/attach-targets";

test("formats linked document type names for the reports menu", () => {
  assert.equal(formatLinkedDocumentTypeNames([]), "");
  assert.equal(
    formatLinkedDocumentTypeNames([
      { name: "Declaração de antecedentes" },
      { name: "Procuração" },
    ]),
    "Declaração de antecedentes · Procuração",
  );
});

test("filters reports linked to a document type", () => {
  const reports = [
    {
      name: "Antecedentes",
      documentTypes: [{ _id: "type-a" }, { _id: "type-b" }],
      documentTypeIds: ["type-a", "type-b"],
    },
    {
      name: "Procuração",
      documentTypes: [{ _id: "type-c" }],
      documentTypeIds: ["type-c"],
    },
    {
      name: "Legacy ids only",
      documentTypeIds: ["type-a"],
    },
  ];

  assert.deepEqual(
    reportsForDocumentType(reports, "type-a").map((item) => item.name),
    ["Antecedentes", "Legacy ids only"],
  );
  assert.deepEqual(
    reportsForDocumentType(reports, "type-c").map((item) => item.name),
    ["Procuração"],
  );
  assert.deepEqual(reportsForDocumentType(reports, "missing"), []);
});

test("prefers a pending process document of the same type when attaching", () => {
  const pending = {
    documentTypeId: "type-a",
    documentRequirementId: "req-1",
    isLatest: true,
    status: "not_started",
  };
  const approved = {
    documentTypeId: "type-a",
    documentRequirementId: "req-2",
    isLatest: true,
    status: "approved",
  };

  assert.equal(
    findProcessDocumentForReportAttach([approved, pending], "type-a"),
    pending,
  );
  assert.equal(
    findProcessDocumentForReportAttach([approved], "type-a"),
    approved,
  );
  assert.equal(
    findProcessDocumentForReportAttach([approved], "type-b"),
    undefined,
  );
});

test("builds attach options from linked types even when the process has no file yet", () => {
  const options = buildReportAttachOptions({
    documentTypes: [
      { _id: "type-a", name: "Declaração de antecedentes" },
      { _id: "type-b", name: "Procuração" },
    ],
    processDocuments: [
      {
        documentTypeId: "type-a",
        documentRequirementId: "req-1",
        isLatest: true,
        status: "not_started",
      },
    ],
  });

  assert.deepEqual(options, [
    {
      documentTypeId: "type-a",
      label: "Declaração de antecedentes",
      documentRequirementId: "req-1",
    },
    {
      documentTypeId: "type-b",
      label: "Procuração",
      documentRequirementId: undefined,
    },
  ]);
});
