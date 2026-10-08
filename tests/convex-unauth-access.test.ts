import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { listUpcomingAppointmentsForViewer } from "../convex/lib/upcomingAppointments";
import {
  EMPTY_CONDITION_VALIDATION,
  EMPTY_FILLABLE_FIELDS,
  EMPTY_REQUIREMENTS_CHECKLIST,
  adminMutationGuard,
  anonymousMutationGuard,
  checklistForViewer,
  documentFlagForViewer,
  documentRowsForViewer,
  fieldValuesForViewer,
  fillableFieldsForViewer,
  notificationForViewer,
  notificationsForViewer,
  publicPreRegisteredEmailFlag,
  rowsForViewer,
  viewerCanAccessCompany,
  viewerCanAccessStandaloneDocument,
} from "../convex/lib/viewerAccess";

const SECRET_VALUES = {
  rnmNumber: "SECRET-RNM",
  protocolNumber: "SECRET-PROTOCOL",
  rnmDeadline: "2026-12-31",
  appointmentDateTime: "2026-10-09T10:00",
};

function convexSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function exportedHandler(source: string, exportName: string): string {
  const marker = `export const ${exportName} =`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing export ${exportName}`);
  const next = source.indexOf("\nexport const ", start + marker.length);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

function assertInternalMutationSource(
  relativePath: string,
  exportName?: string,
): void {
  const source = convexSource(relativePath);
  if (exportName) {
    const handler = exportedHandler(source, exportName);
    assert.match(handler, /internalMutation\(/);
    assert.doesNotMatch(handler, /= mutation\(/);
  } else {
    assert.match(source, /export default internalMutation\(/);
    assert.doesNotMatch(source, /export default mutation\(/);
  }
}

test("individualProcessStatuses:getFillableFields anonymous call returns empty payload, not saved fields", () => {
  const leaked = fillableFieldsForViewer({
    userProfile: null,
    canAccess: true,
    fillableFields: Object.keys(SECRET_VALUES),
    processValues: SECRET_VALUES,
    statusValues: SECRET_VALUES,
  });
  assert.deepEqual(leaked, EMPTY_FILLABLE_FIELDS);
  assert.equal(Object.keys(leaked.filledFieldsData).length, 0);
  assert.doesNotMatch(JSON.stringify(leaked), /SECRET/);

  const denied = fillableFieldsForViewer({
    userProfile: { role: "client" },
    canAccess: false,
    fillableFields: Object.keys(SECRET_VALUES),
    processValues: SECRET_VALUES,
    statusValues: SECRET_VALUES,
  });
  assert.deepEqual(denied, EMPTY_FILLABLE_FIELDS);

  const allowed = fillableFieldsForViewer({
    userProfile: { role: "admin" },
    canAccess: true,
    fillableFields: ["rnmNumber"],
    processValues: SECRET_VALUES,
    statusValues: {},
  });
  assert.equal(allowed.filledFieldsData.rnmNumber, "SECRET-RNM");

  const handler = exportedHandler(
    convexSource("convex/individualProcessStatuses.ts"),
    "getFillableFields",
  );
  assert.match(handler, /getViewerForProcess/);
  assert.match(handler, /EMPTY_FILLABLE_FIELDS/);
  assert.doesNotMatch(handler, /if \(userId !== null\)/);
});

test("appointmentReminders:listUpcomingAppointments anonymous call returns []", () => {
  const now = Date.parse("2026-10-08T12:00:00.000Z");
  const rows = listUpcomingAppointmentsForViewer({
    userProfile: null,
    processes: [
      {
        _id: "proc-a",
        appointmentDateTime: "2026-10-09T10:00",
        personId: "person-a",
        companyApplicantId: "co-a",
      },
    ],
    currentCompanyIds: new Set(),
    collectiveById: new Map(),
    peopleById: new Map([
      ["person-a", { givenNames: "Ada", surname: "Lovelace" }],
    ]),
    now,
    endTime: now + 7 * 24 * 60 * 60 * 1000,
  });
  assert.deepEqual(rows, []);

  const handler = exportedHandler(
    convexSource("convex/appointmentReminders.ts"),
    "listUpcomingAppointments",
  );
  assert.match(handler, /tryGetCurrentUserProfile/);
  assert.match(handler, /return \[\]/);
  assert.doesNotMatch(handler, /individualProcess: process/);
});

test("notifications:getUserNotifications anonymous call returns []", () => {
  const rows = notificationsForViewer(null, [
    {
      userId: "user-1",
      title: "SECRET-NOTE",
      message: "secret",
    },
  ]);
  assert.deepEqual(rows, []);

  const scoped = notificationsForViewer({ userId: "user-1" }, [
    { userId: "user-1", title: "mine", message: "ok" },
    { userId: "user-2", title: "SECRET-OTHER", message: "nope" },
  ]);
  assert.deepEqual(
    scoped.map((row) => row.title),
    ["mine"],
  );

  const handler = exportedHandler(
    convexSource("convex/notifications.ts"),
    "getUserNotifications",
  );
  assert.match(handler, /tryRequireActiveUserProfile/);
  assert.match(handler, /if \(!userProfile\) \{\s*return \[\];/);
  assert.doesNotMatch(handler, /requireActiveUserProfile\(ctx\)/);
});

test("notifications:get anonymous call returns null", () => {
  const row = notificationForViewer(null, {
    userId: "user-1",
    title: "SECRET-NOTE",
    message: "secret",
  });
  assert.equal(row, null);

  const handler = exportedHandler(
    convexSource("convex/notifications.ts"),
    "get",
  );
  assert.match(handler, /tryRequireActiveUserProfile/);
  assert.match(handler, /if \(!userProfile\) \{\s*return null;/);
});

test("lib.requirementsChecklist:getChecklist anonymous call returns empty checklist", () => {
  const leaked = checklistForViewer(
    null,
    true,
    {
      items: [{ type: "document", label: "SECRET-DOC" }],
      summary: { total: 1, completed: 0, partial: 0, pending: 1 },
    },
    EMPTY_REQUIREMENTS_CHECKLIST,
  );
  assert.deepEqual(leaked, EMPTY_REQUIREMENTS_CHECKLIST);

  const handler = exportedHandler(
    convexSource("convex/lib/requirementsChecklist.ts"),
    "getChecklist",
  );
  assert.match(handler, /getViewerForProcess/);
  assert.match(handler, /EMPTY_REQUIREMENTS_CHECKLIST/);
});

test("documentDeliveredConditions:listByDocument anonymous call returns []", () => {
  const rows = documentRowsForViewer(null, true, [
    { notes: "SECRET-CONDITION", fulfilledByUser: { email: "a@b.c" } },
  ]);
  assert.deepEqual(rows, []);

  const handler = exportedHandler(
    convexSource("convex/documentDeliveredConditions.ts"),
    "listByDocument",
  );
  assert.match(handler, /loadDeliveredDocumentForViewer/);
  assert.match(handler, /documentRowsForViewer/);
});

test("documentDeliveredConditions:getValidationStatus anonymous call returns empty validation", () => {
  assert.equal(EMPTY_CONDITION_VALIDATION.allRequiredFulfilled, false);
  assert.equal(EMPTY_CONDITION_VALIDATION.totalConditions, 0);

  const handler = exportedHandler(
    convexSource("convex/documentDeliveredConditions.ts"),
    "getValidationStatus",
  );
  assert.match(handler, /loadDeliveredDocumentForViewer/);
  assert.match(handler, /EMPTY_CONDITION_VALIDATION/);
});

test("documentDeliveredConditions:hasConditions anonymous call returns false", () => {
  assert.equal(documentFlagForViewer(null, true, true), false);

  const handler = exportedHandler(
    convexSource("convex/documentDeliveredConditions.ts"),
    "hasConditions",
  );
  assert.match(handler, /loadDeliveredDocumentForViewer/);
  assert.match(handler, /documentFlagForViewer/);
});

test("documentTypeFieldMappings:getFieldsWithValues anonymous call returns []", () => {
  const rows = fieldValuesForViewer(null, true, [
    { fieldPath: "rnmNumber", currentValue: "SECRET-RNM" },
  ]);
  assert.deepEqual(rows, []);

  const handler = exportedHandler(
    convexSource("convex/documentTypeFieldMappings.ts"),
    "getFieldsWithValues",
  );
  assert.match(handler, /getViewerForProcess/);
  assert.match(handler, /if \(!userProfile \|\| !process\) return \[\]/);
});

test("documents:getVersionHistory anonymous call returns []", () => {
  const versions = [
    { fileUrl: "https://signed.example/secret.pdf", name: "SECRET-DOC" },
  ];
  assert.deepEqual(rowsForViewer(null, true, versions), []);
  assert.equal(
    viewerCanAccessStandaloneDocument(null, "co-own", { companyId: "co-own" }, true),
    false,
  );
  assert.equal(
    viewerCanAccessStandaloneDocument("client", "co-own", { companyId: "co-other" }, false),
    false,
  );
  assert.equal(
    viewerCanAccessStandaloneDocument("client", "co-own", { companyId: "co-own" }, false),
    true,
  );
  assert.equal(
    viewerCanAccessStandaloneDocument("admin", undefined, { companyId: "co-other" }, false),
    true,
  );

  const handler = exportedHandler(
    convexSource("convex/documents.ts"),
    "getVersionHistory",
  );
  assert.match(handler, /tryGetCurrentUserProfile/);
  assert.match(handler, /canAccessDocument/);
  assert.match(handler, /rowsForViewer/);
});

test("userProfiles:checkPreRegisteredEmail returns only a boolean", () => {
  assert.equal(publicPreRegisteredEmailFlag(null), false);
  assert.equal(
    publicPreRegisteredEmailFlag({ userId: "user-1", fullName: "SECRET" } as {
      userId?: string;
    }),
    false,
  );
  assert.equal(
    publicPreRegisteredEmailFlag({ fullName: "Invited Name" } as {
      userId?: string;
    }),
    true,
  );

  const handler = exportedHandler(
    convexSource("convex/userProfiles.ts"),
    "checkPreRegisteredEmail",
  );
  assert.match(handler, /publicPreRegisteredEmailFlag/);
  assert.match(handler, /returns: v\.boolean\(\)/);
  assert.doesNotMatch(handler, /fullName/);
  assert.doesNotMatch(handler, /companyName/);
  assert.doesNotMatch(handler, /userProfile:/);
});

test("companies:getEconomicActivities anonymous call returns []", () => {
  assert.deepEqual(
    rowsForViewer(null, true, [{ name: "SECRET-CNAE" }]),
    [],
  );
  assert.equal(
    viewerCanAccessCompany(null, new Set(["co-own"]), "co-own"),
    false,
  );
  assert.equal(
    viewerCanAccessCompany("client", new Set(["co-own"]), "co-other"),
    false,
  );
  assert.equal(
    viewerCanAccessCompany("client", new Set(["co-own"]), "co-own"),
    true,
  );
  assert.equal(
    viewerCanAccessCompany("admin", new Set(), "co-other"),
    true,
  );

  const handler = exportedHandler(
    convexSource("convex/companies.ts"),
    "getEconomicActivities",
  );
  assert.match(handler, /getViewerForCompany/);
  assert.match(handler, /rowsForViewer/);
});

test("documentRequirements:list anonymous call returns []", () => {
  assert.deepEqual(
    rowsForViewer(null, true, [{ description: "SECRET-REQ" }]),
    [],
  );

  const handler = exportedHandler(
    convexSource("convex/documentRequirements.ts"),
    "list",
  );
  assert.match(handler, /tryGetCurrentUserProfile/);
  assert.match(handler, /rowsForViewer/);
});

test("documentDeliveredConditions:syncMissingConditions anonymous call throws and writes nothing", () => {
  let wrote = false;
  const outcome = anonymousMutationGuard(null, () => {
    wrote = true;
  });
  assert.equal(outcome.threw, true);
  assert.equal(outcome.wrote, false);
  assert.equal(wrote, false);
  assert.match(outcome.message ?? "", /Authentication required/);

  const handler = exportedHandler(
    convexSource("convex/documentDeliveredConditions.ts"),
    "syncMissingConditions",
  );
  assert.match(handler, /getCurrentUserProfile/);
  assert.match(handler, /assertAuthenticatedWriter/);
  const authIdx = handler.indexOf("getCurrentUserProfile");
  const insertIdx = handler.indexOf("ctx.db.insert");
  assert.ok(authIdx >= 0 && insertIdx > authIdx);
});

test("individualProcessAddresses:ensureLegacyMigrated anonymous call throws and writes nothing", () => {
  let wrote = false;
  const outcome = anonymousMutationGuard(null, () => {
    wrote = true;
  });
  assert.equal(outcome.threw, true);
  assert.equal(outcome.wrote, false);
  assert.equal(wrote, false);

  const handler = exportedHandler(
    convexSource("convex/individualProcessAddresses.ts"),
    "ensureLegacyMigrated",
  );
  assert.match(handler, /getCurrentUserProfile/);
  assert.match(handler, /assertAuthenticatedWriter/);
  assert.doesNotMatch(handler, /tryGetCurrentUserProfile/);
  const authIdx = handler.indexOf("getCurrentUserProfile");
  const persistIdx = handler.indexOf("persistLegacyAddressIfNeeded");
  assert.ok(authIdx >= 0 && persistIdx > authIdx);
});

test("migrations/importPeopleCsv default is internalMutation", () => {
  assertInternalMutationSource("convex/migrations/importPeopleCsv.ts");
});

test("migrations/renameFullNameToGivenNames:migrate is internalMutation", () => {
  assertInternalMutationSource(
    "convex/migrations/renameFullNameToGivenNames.ts",
    "migrate",
  );
});

test("migrations/migrateConditionsToLinks:cleanupOrphans is internalMutation", () => {
  assertInternalMutationSource(
    "convex/migrations/migrateConditionsToLinks.ts",
    "cleanupOrphans",
  );
});

test("migrations/renameMainProcessesToCollectiveProcesses:migrateMainProcessesToCollective is internalMutation", () => {
  assertInternalMutationSource(
    "convex/migrations/renameMainProcessesToCollectiveProcesses.ts",
    "migrateMainProcessesToCollective",
  );
});

test("migrations/migrateDocumentScopeToDocumentType:migrate is internalMutation", () => {
  assertInternalMutationSource(
    "convex/migrations/migrateDocumentScopeToDocumentType.ts",
    "migrate",
  );
});

test("migrations/linkPeopleToCompanies default is internalMutation", () => {
  assertInternalMutationSource("convex/migrations/linkPeopleToCompanies.ts");
});

test("migrations/removeConsulateNameField default is internalMutation", () => {
  assertInternalMutationSource("convex/migrations/removeConsulateNameField.ts");
});

test("migrations/removeTitleFromNotes default is internalMutation", () => {
  assertInternalMutationSource("convex/migrations/removeTitleFromNotes.ts");
});

test("migrations/removeOrderNumberFromCaseStatuses default is internalMutation", () => {
  assertInternalMutationSource(
    "convex/migrations/removeOrderNumberFromCaseStatuses.ts",
  );
});

test("migrations/migrateConditionsToLinks:migrate requires admin and writes nothing when rejected", () => {
  const anonymous = adminMutationGuard(null, () => {
    throw new Error("should not write");
  });
  assert.equal(anonymous.threw, true);
  assert.equal(anonymous.wrote, false);

  let wrote = false;
  const client = adminMutationGuard({ role: "client" }, () => {
    wrote = true;
  });
  assert.equal(client.threw, true);
  assert.equal(client.wrote, false);
  assert.equal(wrote, false);

  const admin = adminMutationGuard({ role: "admin" }, () => {
    wrote = true;
  });
  assert.equal(admin.threw, false);
  assert.equal(admin.wrote, true);

  const handler = exportedHandler(
    convexSource("convex/migrations/migrateConditionsToLinks.ts"),
    "migrate",
  );
  assert.match(handler, /requireAdmin/);
  const authIdx = handler.indexOf("requireAdmin");
  const insertIdx = handler.indexOf("ctx.db.insert");
  assert.ok(authIdx >= 0 && insertIdx > authIdx);
});

test("migrations/migrateConditionsToLinks:migrateManual requires admin and writes nothing when rejected", () => {
  const anonymous = adminMutationGuard(null, () => undefined);
  assert.equal(anonymous.threw, true);
  assert.equal(anonymous.wrote, false);

  const handler = exportedHandler(
    convexSource("convex/migrations/migrateConditionsToLinks.ts"),
    "migrateManual",
  );
  assert.match(handler, /requireAdmin/);
  const authIdx = handler.indexOf("requireAdmin");
  const insertIdx = handler.indexOf("ctx.db.insert");
  assert.ok(authIdx >= 0 && insertIdx > authIdx);
});

test("exchangeRates:getRateToBRL anonymous call is rejected", () => {
  const outcome = anonymousMutationGuard(null, () => {
    throw new Error("should not fetch");
  });
  assert.equal(outcome.threw, true);
  assert.equal(outcome.wrote, false);

  const handler = exportedHandler(
    convexSource("convex/exchangeRates.ts"),
    "getRateToBRL",
  );
  assert.match(handler, /getAuthUserId/);
  assert.match(handler, /Authentication required/);
  const authIdx = handler.indexOf("getAuthUserId");
  const fetchIdx = handler.indexOf("fetch(");
  assert.ok(authIdx >= 0 && fetchIdx > authIdx);
});
