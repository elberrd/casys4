import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  adminMutationGuard,
  allowWriteWhenParentMissing,
  assertCanWriteOrphanedCondition,
  assertCanWriteOrphanedProcessChild,
  companiesForViewer,
  companyHasLinkedIndividualProcesses,
  COMPANY_HAS_PROCESSES_CODE,
  countLinkedIndividualProcesses,
  crossTenantMutationGuard,
  personIdsForCurrentCompanies,
  profilesForViewer,
  rowsForViewer,
  scopeIndividualProcessesForUser,
  viewerCanAccessCompany,
  viewerCanAccessLinkedRecord,
  viewerCanAccessProcess,
  viewerCanAccessStandaloneDocument,
} from "../convex/lib/viewerAccess";
import {
  companyDeleteErrorMessage,
  linkedProcessCountFromDeleteError,
} from "../lib/company-delete-error";

const CLIENT_A = "co-a";
const CLIENT_B = "co-b";
const COMPANY_A = new Set([CLIENT_A]);
const COMPANY_B = new Set([CLIENT_B]);

const PROCESS_A = {
  _id: "proc-a",
  companyApplicantId: CLIENT_A,
};
const PROCESS_B = {
  _id: "proc-b",
  companyApplicantId: CLIENT_B,
};
const PROCESS_B_USER_APPLICANT = {
  _id: "proc-b-user",
  userApplicantCompanyId: CLIENT_B,
};
const PROCESS_B_COLLECTIVE = {
  _id: "proc-b-coll",
  collectiveProcessId: "coll-b",
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

type AccessClass =
  | "tenant-process"
  | "tenant-company"
  | "tenant-person"
  | "user-owned"
  | "admin"
  | "global-auth"
  | "public-flag"
  | "public-catalog";

const CLASS_TOKENS: Record<AccessClass, RegExp> = {
  "tenant-process":
    /getViewerForProcess|requireClientCanAccessProcess|viewerCanAccessProcess|viewerCanAccessLinkedRecord|scopeIndividualProcessesForUser|getIndividualProcessCompanyIds|noteAccessibleToViewer|requireNoteProcessAccess|loadDeliveredDocumentForViewer|viewerCanAccessActivityEntity|requireClientCanAccessCollective|filterTasksForClientViewer|filterProcessesForUser|processBelongsToCompanies|allowWriteWhenParentMissing|assertCanWriteOrphanedCondition|assertCanWriteDeliveredCondition/,
  "tenant-company":
    /getViewerForCompany|getViewerForCollectiveProcess|requireCompanyAccess|requireClientCanAccessCollective|getClientCurrentCompanyIds|viewerCanAccessCompany|companiesForViewer|profilesForViewer|requireClient|canAccessDocument/,
  "tenant-person":
    /getClientCurrentCompanyIds|personOwnedByClient|personIdsForCurrentCompanies|clientCanReadPerson|assertCanReadPerson|requirePersonReadAccess/,
  "user-owned":
    /getAuthUserId|getCurrentUserProfile|requireActiveUserProfile|tryRequireActiveUserProfile|userProfile\.userId|currentUser\.userId|assignedTo|getOwnedNotification|requireRequestAccess/,
  admin: /requireAdmin|assertAdminWriter|checkAdminAccess/,
  "global-auth":
    /getCurrentUserProfile|tryGetCurrentUserProfile|getAuthUserId|requireAdmin|requireActiveUserProfile/,
  "public-flag": /publicPreRegisteredEmailFlag/,
  "public-catalog": /(?:)/,
};

const FILE_DEFAULTS: Record<string, AccessClass> = {
  "convex/appointmentReminders.ts": "tenant-process",
  "convex/bulkOperations.ts": "admin",
  "convex/caseStatuses.ts": "public-catalog",
  "convex/cboCodes.ts": "public-catalog",
  "convex/cities.ts": "public-catalog",
  "convex/collectiveProcesses.ts": "tenant-company",
  "convex/consulates.ts": "public-catalog",
  "convex/countries.ts": "public-catalog",
  "convex/dashboard.ts": "tenant-process",
  "convex/documentCategories.ts": "public-catalog",
  "convex/documentRequirements.ts": "public-catalog",
  "convex/documentTemplates.ts": "public-catalog",
  "convex/documentTypeConditionLinks.ts": "public-catalog",
  "convex/documentTypeConditions.ts": "public-catalog",
  "convex/documentTypeFieldMappings.ts": "public-catalog",
  "convex/documentTypes.ts": "public-catalog",
  "convex/documentTypesLegalFrameworks.ts": "public-catalog",
  "convex/economicActivities.ts": "public-catalog",
  "convex/exchangeRates.ts": "global-auth",
  "convex/legalFrameworkInfoRequirements.ts": "public-catalog",
  "convex/legalFrameworks.ts": "public-catalog",
  "convex/myFunctions.ts": "global-auth",
  "convex/noteAttachments.ts": "admin",
  "convex/noteReminders.ts": "admin",
  "convex/notifications.ts": "user-owned",
  "convex/passportDocumentAttachments.ts": "admin",
  "convex/passportOcr.ts": "admin",
  "convex/passportUpload.ts": "tenant-person",
  "convex/peopleCompanies.ts": "tenant-company",
  "convex/personPassportAttachments.ts": "tenant-person",
  "convex/personPassportOcrVerifications.ts": "tenant-person",
  "convex/processReportEdits.ts": "admin",
  "convex/processReports.ts": "admin",
  "convex/processRequestMessages.ts": "user-owned",
  "convex/processRequests.ts": "tenant-company",
  "convex/processTypes.ts": "public-catalog",
  "convex/reportTemplateSeeds.ts": "admin",
  "convex/reportTemplates.ts": "public-catalog",
  "convex/savedFilters.ts": "user-owned",
  "convex/seedCaseStatuses.ts": "admin",
  "convex/seedCompanies.ts": "admin",
  "convex/seedCountries.ts": "admin",
  "convex/seedInitialAdmin.ts": "admin",
  "convex/states.ts": "public-catalog",
  "convex/verifyCompanies.ts": "admin",
};

const FUNCTION_RULES: Record<string, AccessClass> = {
  "convex/activityLogs.ts:get": "user-owned",
  "convex/activityLogs.ts:getActivityLogs": "user-owned",
  "convex/activityLogs.ts:getAuditSummary": "user-owned",
  "convex/activityLogs.ts:getEntityHistory": "tenant-process",
  "convex/activityLogs.ts:getIndividualProcessFullHistory": "tenant-process",
  "convex/activityLogs.ts:checkAdminAccess": "admin",
  "convex/activityLogs.ts:exportActivityLogs": "admin",
  "convex/activityLogs.ts:getUserActivity": "user-owned",
  "convex/activityLogs.ts:getFilterOptions": "user-owned",
  "convex/activityLogs.ts:list": "user-owned",
  "convex/activityLogs.ts:getRecent": "user-owned",
  "convex/companies.ts:list": "tenant-company",
  "convex/companies.ts:listActive": "tenant-company",
  "convex/companies.ts:get": "tenant-company",
  "convex/companies.ts:create": "admin",
  "convex/companies.ts:update": "admin",
  "convex/companies.ts:remove": "admin",
  "convex/companies.ts:getEconomicActivities": "tenant-company",
  "convex/companies.ts:addEconomicActivity": "admin",
  "convex/companies.ts:removeEconomicActivity": "admin",
  "convex/companies.ts:setEconomicActivities": "admin",
  "convex/companies.ts:getCompanyDashboardStats": "tenant-company",
  "convex/companies.ts:getCompanyProcessTypeDistribution": "tenant-company",
  "convex/companies.ts:getCompanyLegalFrameworkDistribution": "tenant-company",
  "convex/companies.ts:getCompanyStatusDistribution": "tenant-company",
  "convex/companies.ts:getCompanyQualificationStats": "tenant-company",
  "convex/companies.ts:getProcessesWithMissingData": "tenant-company",
  "convex/companyGroups.ts:create": "admin",
  "convex/companyGroups.ts:update": "admin",
  "convex/companyGroups.ts:remove": "admin",
  "convex/companyGroups.ts:backfillFromGroupNames": "admin",
  "convex/companyGroups.ts:list": "global-auth",
  "convex/companyGroups.ts:listActive": "global-auth",
  "convex/companyGroups.ts:get": "global-auth",
  "convex/documentDeliveredConditions.ts:listByDocument": "tenant-process",
  "convex/documentDeliveredConditions.ts:getValidationStatus": "tenant-process",
  "convex/documentDeliveredConditions.ts:hasConditions": "tenant-process",
  "convex/documentDeliveredConditions.ts:toggleFulfillment": "tenant-process",
  "convex/documentDeliveredConditions.ts:remove": "admin",
  "convex/documentDeliveredConditions.ts:syncMissingConditions": "tenant-process",
  "convex/documentTypeFieldMappings.ts:getFieldsWithValues": "tenant-process",
  "convex/documentTypeFieldMappings.ts:updateFieldValues": "admin",
  "convex/documents.ts:list": "tenant-company",
  "convex/documents.ts:get": "tenant-company",
  "convex/documents.ts:getVersionHistory": "tenant-company",
  "convex/documents.ts:create": "admin",
  "convex/documents.ts:update": "admin",
  "convex/documents.ts:remove": "admin",
  "convex/documents.ts:bulkRemove": "admin",
  "convex/documents.ts:uploadNewVersion": "admin",
  "convex/documents.ts:restoreVersion": "admin",
  "convex/documents.ts:generateUploadUrl": "admin",
  "convex/documentsDelivered.ts:listCompanyDocumentsForReuse": "admin",
  "convex/documentsDelivered.ts:getReusableDocumentTypeIds": "admin",
  "convex/documentsDelivered.ts:generateUploadUrl": "global-auth",
  "convex/exports.ts:exportCollectiveProcesses": "tenant-company",
  "convex/exports.ts:exportIndividualProcesses": "tenant-process",
  "convex/exports.ts:exportPeople": "tenant-person",
  "convex/exports.ts:exportDocuments": "tenant-process",
  "convex/exports.ts:exportTasks": "tenant-process",
  "convex/individualProcessAddresses.ts:listByProcess": "tenant-process",
  "convex/individualProcessAddresses.ts:getCurrent": "tenant-process",
  "convex/individualProcessAddresses.ts:ensureLegacyMigrated": "tenant-process",
  "convex/individualProcessAddresses.ts:listByPerson": "tenant-person",
  "convex/individualProcessAddresses.ts:getCurrentByPerson": "tenant-person",
  "convex/individualProcessAddresses.ts:create": "admin",
  "convex/individualProcessAddresses.ts:createForPerson": "admin",
  "convex/individualProcessAddresses.ts:update": "admin",
  "convex/individualProcessAddresses.ts:setCurrent": "admin",
  "convex/individualProcessAddresses.ts:remove": "admin",
  "convex/individualProcessStatuses.ts:getFillableFields": "tenant-process",
  "convex/individualProcesses.ts:list": "tenant-company",
  "convex/individualProcesses.ts:get": "tenant-process",
  "convex/individualProcesses.ts:listByCollectiveProcess": "tenant-company",
  "convex/individualProcesses.ts:listRNMAppointments": "tenant-company",
  "convex/individualProcesses.ts:listForSelector": "tenant-company",
  "convex/individualProcesses.ts:create": "admin",
  "convex/individualProcesses.ts:createFromExisting": "admin",
  "convex/individualProcesses.ts:update": "admin",
  "convex/individualProcesses.ts:updateProcessStatus": "admin",
  "convex/individualProcesses.ts:markAsPrevious": "admin",
  "convex/individualProcesses.ts:remove": "admin",
  "convex/individualProcesses.ts:regenerateDocumentChecklist": "admin",
  "convex/individualProcesses.ts:updateUrgentForCollectiveGroup": "admin",
  "convex/individualProcesses.ts:updateAuthorizationForCollectiveGroup": "admin",
  "convex/lib/requirementsChecklist.ts:getChecklist": "tenant-process",
  "convex/notes.ts:listAll": "tenant-process",
  "convex/notes.ts:list": "tenant-process",
  "convex/notes.ts:countByIndividualProcess": "tenant-process",
  "convex/notes.ts:get": "tenant-process",
  "convex/notes.ts:create": "tenant-process",
  "convex/notes.ts:update": "tenant-process",
  "convex/notes.ts:remove": "tenant-process",
  "convex/passports.ts:list": "tenant-person",
  "convex/passports.ts:listByPerson": "tenant-person",
  "convex/passports.ts:getActivePassportByPerson": "tenant-person",
  "convex/passports.ts:countByPerson": "tenant-person",
  "convex/passports.ts:get": "tenant-person",
  "convex/passports.ts:checkPassportNumberDuplicate": "global-auth",
  "convex/passports.ts:create": "admin",
  "convex/passports.ts:update": "admin",
  "convex/passports.ts:remove": "admin",
  "convex/people.ts:list": "tenant-company",
  "convex/people.ts:search": "tenant-company",
  "convex/people.ts:listPeopleByCompany": "tenant-company",
  "convex/people.ts:get": "tenant-company",
  "convex/people.ts:checkCpfDuplicate": "tenant-person",
  "convex/people.ts:findByNormalizedName": "tenant-person",
  "convex/people.ts:listEligibleForClientUser": "admin",
  "convex/people.ts:listPeopleWithCompanies": "tenant-company",
  "convex/people.ts:create": "admin",
  "convex/people.ts:update": "admin",
  "convex/people.ts:remove": "admin",
  "convex/processHistory.ts:list": "tenant-process",
  "convex/processHistory.ts:getByIndividualProcess": "tenant-process",
  "convex/tasks.ts:list": "tenant-process",
  "convex/tasks.ts:get": "tenant-process",
  "convex/tasks.ts:getMyTasks": "tenant-process",
  "convex/userProfiles.ts:list": "tenant-company",
  "convex/userProfiles.ts:get": "tenant-company",
  "convex/userProfiles.ts:getCurrentUser": "user-owned",
  "convex/userProfiles.ts:updateIndividualProcessesColumnVisibility": "user-owned",
  "convex/userProfiles.ts:create": "admin",
  "convex/userProfiles.ts:update": "user-owned",
  "convex/userProfiles.ts:updateActiveStatus": "admin",
  "convex/userProfiles.ts:remove": "admin",
  "convex/userProfiles.ts:preRegisterUser": "admin",
  "convex/userProfiles.ts:resetUserPassword": "admin",
  "convex/userProfiles.ts:changeOwnPassword": "user-owned",
  "convex/userProfiles.ts:checkPreRegisteredEmail": "public-flag",
  "convex/userProfiles.ts:listAdminUsers": "global-auth",
};

const SKIP_FILES = new Set([
  "convex/auth.ts",
  "convex/auth.config.ts",
  "convex/http.ts",
  "convex/cron.ts",
  "convex/schema.ts",
]);

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = full.split(path.sep).join("/");
    if (rel.includes("/_generated/") || rel.includes("/migrations/")) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkTsFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      out.push(rel);
    }
  }
  return out;
}

function listPublicFunctions(): Array<{
  file: string;
  name: string;
  kind: "query" | "mutation" | "action";
  handler: string;
}> {
  const files = walkTsFiles("convex");
  const results: Array<{
    file: string;
    name: string;
    kind: "query" | "mutation" | "action";
    handler: string;
  }> = [];
  const exportRe =
    /export const (\w+) = (query|mutation|action)\(/g;
  for (const file of files) {
    if (SKIP_FILES.has(file)) continue;
    const source = convexSource(file);
    let match: RegExpExecArray | null;
    exportRe.lastIndex = 0;
    const names: Array<{ name: string; kind: "query" | "mutation" | "action" }> =
      [];
    while ((match = exportRe.exec(source))) {
      const lineStart = source.lastIndexOf("\n", match.index) + 1;
      const leading = source.slice(lineStart, match.index);
      if (leading.trimStart().startsWith("//")) continue;
      names.push({
        name: match[1]!,
        kind: match[2] as "query" | "mutation" | "action",
      });
    }
    for (const { name, kind } of names) {
      results.push({
        file,
        name,
        kind,
        handler: exportedHandler(source, name),
      });
    }
  }
  return results;
}

function classify(file: string, name: string, handler: string): AccessClass {
  const key = `${file}:${name}`;
  if (FUNCTION_RULES[key]) return FUNCTION_RULES[key];
  const inferred: AccessClass[] = [
    "tenant-process",
    "tenant-company",
    "tenant-person",
    "admin",
    "user-owned",
    "public-flag",
    "global-auth",
  ];
  for (const access of inferred) {
    if (CLASS_TOKENS[access].test(handler)) return access;
  }
  if (FILE_DEFAULTS[file]) return FILE_DEFAULTS[file];
  throw new Error(
    `Unclassified public function ${key} — add it to FUNCTION_RULES or FILE_DEFAULTS`,
  );
}

test("client A cannot access client B company, process, or linked records", () => {
  assert.equal(viewerCanAccessCompany("client", COMPANY_A, CLIENT_B), false);
  assert.equal(viewerCanAccessCompany("client", COMPANY_A, CLIENT_A), true);
  assert.equal(viewerCanAccessCompany("admin", COMPANY_A, CLIENT_B), true);
  assert.equal(viewerCanAccessCompany(null, COMPANY_A, CLIENT_A), false);

  assert.equal(
    viewerCanAccessProcess("client", COMPANY_A, PROCESS_B),
    false,
  );
  assert.equal(
    viewerCanAccessProcess("client", COMPANY_A, PROCESS_A),
    true,
  );
  assert.equal(
    viewerCanAccessProcess("client", COMPANY_A, PROCESS_B_USER_APPLICANT),
    false,
  );
  assert.equal(
    viewerCanAccessProcess(
      "client",
      COMPANY_A,
      PROCESS_B_COLLECTIVE,
      CLIENT_B,
    ),
    false,
  );
  assert.equal(
    viewerCanAccessProcess(
      "client",
      COMPANY_A,
      PROCESS_B_COLLECTIVE,
      CLIENT_A,
    ),
    true,
  );

  assert.equal(
    viewerCanAccessLinkedRecord({
      role: "client",
      currentCompanyIds: COMPANY_A,
      individualProcess: PROCESS_B,
    }),
    false,
  );
  assert.equal(
    viewerCanAccessLinkedRecord({
      role: "client",
      currentCompanyIds: COMPANY_A,
      individualProcess: PROCESS_A,
    }),
    true,
  );
  assert.equal(
    viewerCanAccessLinkedRecord({
      role: "client",
      currentCompanyIds: COMPANY_A,
      collectiveCompanyId: CLIENT_B,
    }),
    false,
  );

  const companies = companiesForViewer("client", COMPANY_A, [
    { _id: CLIENT_A, name: "A" },
    { _id: CLIENT_B, name: "SECRET-B" },
  ]);
  assert.deepEqual(
    companies.map((row) => row._id),
    [CLIENT_A],
  );
  assert.doesNotMatch(JSON.stringify(companies), /SECRET-B/);

  const profiles = profilesForViewer("client", COMPANY_A, [
    { companyId: CLIENT_A, fullName: "Alice" },
    { companyId: CLIENT_B, fullName: "SECRET-BOB" },
  ]);
  assert.deepEqual(
    profiles.map((row) => row.fullName),
    ["Alice"],
  );

  assert.deepEqual(
    rowsForViewer({ role: "client" }, false, [{ secret: "B" }]),
    [],
  );
});

test("client A cannot modify client B company data", () => {
  let wrote = false;
  const denied = crossTenantMutationGuard(
    "client",
    COMPANY_A,
    CLIENT_B,
    () => {
      wrote = true;
    },
  );
  assert.equal(denied.threw, true);
  assert.equal(denied.wrote, false);
  assert.equal(wrote, false);

  const allowed = crossTenantMutationGuard(
    "client",
    COMPANY_A,
    CLIENT_A,
    () => {
      wrote = true;
    },
  );
  assert.equal(allowed.threw, false);
  assert.equal(allowed.wrote, true);

  const clientAdmin = adminMutationGuard({ role: "client" }, () => {
    throw new Error("should not write");
  });
  assert.equal(clientAdmin.threw, true);
  assert.equal(clientAdmin.wrote, false);
});

test("companies.remove blocks individual processes via applicant and userApplicantCompany", () => {
  assert.equal(
    companyHasLinkedIndividualProcesses(CLIENT_A, { _id: "proc-a" }, []),
    true,
  );
  assert.equal(
    companyHasLinkedIndividualProcesses(CLIENT_A, null, [
      { userApplicantCompanyId: CLIENT_A },
    ]),
    true,
  );
  assert.equal(
    companyHasLinkedIndividualProcesses(CLIENT_A, null, [
      { companyApplicantId: CLIENT_B, userApplicantCompanyId: CLIENT_B },
    ]),
    false,
  );
  assert.equal(
    countLinkedIndividualProcesses(CLIENT_A, [
      { companyApplicantId: CLIENT_A },
      { userApplicantCompanyId: CLIENT_A },
      { companyApplicantId: CLIENT_B },
    ]),
    2,
  );

  const handler = exportedHandler(convexSource("convex/companies.ts"), "remove");
  assert.match(handler, /requireAdmin/);
  assert.match(handler, /countLinkedIndividualProcesses/);
  assert.match(handler, /userApplicantCompanyId/);
  assert.match(handler, new RegExp(COMPANY_HAS_PROCESSES_CODE));
  assert.match(handler, /ConvexError/);
});

test("scopeIndividualProcessesForUser hides client B processes from client A", () => {
  const scoped = scopeIndividualProcessesForUser(
    "client",
    [PROCESS_A, PROCESS_B, PROCESS_B_USER_APPLICANT, PROCESS_B_COLLECTIVE],
    COMPANY_A,
    new Map([["coll-b", CLIENT_B]]),
  );
  assert.deepEqual(
    scoped.map((row) => row._id),
    ["proc-a"],
  );
});

test("personIdsForCurrentCompanies ignores past-employer links of company B", () => {
  const ids = personIdsForCurrentCompanies(COMPANY_A, [
    { personId: "p-a", companyId: CLIENT_A, isCurrent: true },
    { personId: "p-b", companyId: CLIENT_B, isCurrent: true },
    { personId: "p-past", companyId: CLIENT_A, isCurrent: false },
  ]);
  assert.equal(ids.has("p-a"), true);
  assert.equal(ids.has("p-b"), false);
  assert.equal(ids.has("p-past"), false);
});

test("standalone documents of company B are hidden from client A", () => {
  assert.equal(
    viewerCanAccessStandaloneDocument(
      "client",
      COMPANY_A,
      { companyId: CLIENT_B },
      false,
    ),
    false,
  );
  assert.equal(
    viewerCanAccessStandaloneDocument(
      "client",
      COMPANY_A,
      { companyId: CLIENT_A },
      false,
    ),
    true,
  );
});

const TENANT_FUNCTIONS: Array<{
  file: string;
  name: string;
  access: AccessClass;
}> = [
  { file: "convex/notes.ts", name: "list", access: "tenant-process" },
  { file: "convex/notes.ts", name: "listAll", access: "tenant-process" },
  { file: "convex/notes.ts", name: "get", access: "tenant-process" },
  { file: "convex/notes.ts", name: "create", access: "tenant-process" },
  { file: "convex/notes.ts", name: "update", access: "tenant-process" },
  { file: "convex/notes.ts", name: "remove", access: "tenant-process" },
  { file: "convex/notes.ts", name: "countByIndividualProcess", access: "tenant-process" },
  { file: "convex/tasks.ts", name: "list", access: "tenant-process" },
  { file: "convex/tasks.ts", name: "get", access: "tenant-process" },
  { file: "convex/tasks.ts", name: "getMyTasks", access: "tenant-process" },
  { file: "convex/processHistory.ts", name: "list", access: "tenant-process" },
  { file: "convex/processHistory.ts", name: "getByIndividualProcess", access: "tenant-process" },
  { file: "convex/activityLogs.ts", name: "getEntityHistory", access: "tenant-process" },
  { file: "convex/activityLogs.ts", name: "getIndividualProcessFullHistory", access: "tenant-process" },
  { file: "convex/documentDeliveredConditions.ts", name: "toggleFulfillment", access: "tenant-process" },
  { file: "convex/documentDeliveredConditions.ts", name: "remove", access: "admin" },
  { file: "convex/documentsDelivered.ts", name: "toggleExcludeFromReport", access: "tenant-process" },
  { file: "convex/documentsDelivered.ts", name: "bulkExcludeFromReportByDefault", access: "tenant-process" },
  { file: "convex/documentsDelivered.ts", name: "reuseCompanyDocument", access: "tenant-process" },
  { file: "convex/documentsDelivered.ts", name: "bulkReuseCompanyDocuments", access: "tenant-process" },
  { file: "convex/documentsDelivered.ts", name: "submitInformationFields", access: "tenant-process" },
  { file: "convex/companies.ts", name: "list", access: "tenant-company" },
  { file: "convex/companies.ts", name: "get", access: "tenant-company" },
  { file: "convex/companies.ts", name: "getEconomicActivities", access: "tenant-company" },
  { file: "convex/companies.ts", name: "getCompanyDashboardStats", access: "tenant-company" },
  { file: "convex/companies.ts", name: "addEconomicActivity", access: "admin" },
  { file: "convex/exports.ts", name: "exportIndividualProcesses", access: "tenant-process" },
  { file: "convex/exports.ts", name: "exportPeople", access: "tenant-person" },
  { file: "convex/passports.ts", name: "get", access: "tenant-person" },
  { file: "convex/people.ts", name: "checkCpfDuplicate", access: "tenant-person" },
  { file: "convex/userProfiles.ts", name: "list", access: "tenant-company" },
  { file: "convex/individualProcesses.ts", name: "get", access: "tenant-process" },
];

for (const fn of TENANT_FUNCTIONS) {
  test(`${fn.file.replace("convex/", "").replace(".ts", "")}:${fn.name} enforces ${fn.access} so client A cannot reach client B`, () => {
    const handler = exportedHandler(convexSource(fn.file), fn.name);
    assert.match(handler, CLASS_TOKENS[fn.access]);
    if (fn.access === "admin") {
      const guard = adminMutationGuard({ role: "client" }, () => undefined);
      assert.equal(guard.threw, true);
      assert.equal(guard.wrote, false);
    }
  });
}

test("every public Convex query/mutation/action is classified and uses its access helper", () => {
  const functions = listPublicFunctions();
  assert.ok(functions.length > 80, `expected a full sweep, got ${functions.length}`);

  const missing: string[] = [];
  for (const fn of functions) {
    const access = classify(fn.file, fn.name, fn.handler);
    if (access === "public-catalog") continue;
    const token = CLASS_TOKENS[access];
    if (!token.test(fn.handler)) {
      missing.push(`${fn.file}:${fn.name} (${access})`);
    }
  }
  assert.deepEqual(missing, []);
});

test("admin and note owner may write when the parent process is gone; other clients cannot", () => {
  assert.equal(
    allowWriteWhenParentMissing({
      parentMissing: true,
      role: "admin",
    }),
    true,
  );
  assert.equal(
    allowWriteWhenParentMissing({
      parentMissing: true,
      role: "client",
      isOwner: true,
    }),
    true,
  );
  assert.equal(
    allowWriteWhenParentMissing({
      parentMissing: true,
      role: "client",
      isOwner: false,
    }),
    false,
  );
  assert.equal(
    allowWriteWhenParentMissing({
      parentMissing: false,
      role: "admin",
    }),
    false,
  );

  assert.doesNotThrow(() =>
    assertCanWriteOrphanedProcessChild({
      parentMissing: true,
      role: "admin",
    }),
  );
  assert.doesNotThrow(() =>
    assertCanWriteOrphanedProcessChild({
      parentMissing: true,
      role: "client",
      isOwner: true,
    }),
  );
  assert.throws(
    () =>
      assertCanWriteOrphanedProcessChild({
        parentMissing: true,
        role: "client",
      }),
    /Individual process not found/,
  );
});

test("notes.update and notes.remove allow orphaned parents; create still requires a live process", () => {
  const update = exportedHandler(convexSource("convex/notes.ts"), "update");
  const remove = exportedHandler(convexSource("convex/notes.ts"), "remove");
  const create = exportedHandler(convexSource("convex/notes.ts"), "create");

  assert.match(update, /allowMissingParent:\s*true/);
  assert.match(remove, /allowMissingParent:\s*true/);
  assert.doesNotMatch(create, /allowMissingParent:\s*true/);
  assert.match(
    convexSource("convex/notes.ts"),
    /function requireNoteProcessAccess[\s\S]*allowWriteWhenParentMissing/,
  );
});

test("other process-child mutations allow admin writes when the parent is gone", () => {
  const toggleCondition = exportedHandler(
    convexSource("convex/documentDeliveredConditions.ts"),
    "toggleFulfillment",
  );
  const toggleExclude = exportedHandler(
    convexSource("convex/documentsDelivered.ts"),
    "toggleExcludeFromReport",
  );
  const updateNotes = exportedHandler(
    convexSource("convex/documentsDelivered.ts"),
    "updateVersionNotes",
  );
  const removeAddress = exportedHandler(
    convexSource("convex/individualProcessAddresses.ts"),
    "remove",
  );

  assert.match(toggleCondition, /assertCanWriteDeliveredCondition/);
  for (const handler of [toggleExclude, updateNotes, removeAddress]) {
    assert.match(handler, /allowWriteWhenParentMissing/);
  }
});

function tryOrphanToggle(role: string): {
  threw: boolean;
  wrote: boolean;
  message?: string;
} {
  let wrote = false;
  try {
    assertCanWriteOrphanedCondition({
      documentMissing: true,
      processMissing: true,
      role,
    });
    wrote = true;
    return { threw: false, wrote };
  } catch (error) {
    return {
      threw: true,
      wrote,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

test("client of the same company cannot remove a live condition", () => {
  let wrote = false;
  const outcome = adminMutationGuard({ role: "client" }, () => {
    wrote = true;
  });
  assert.equal(outcome.threw, true);
  assert.equal(outcome.wrote, false);
  assert.equal(wrote, false);
  assert.match(outcome.message ?? "", /administrator privileges/);
  assert.equal(viewerCanAccessProcess("client", COMPANY_A, PROCESS_A), true);

  const removeHandler = exportedHandler(
    convexSource("convex/documentDeliveredConditions.ts"),
    "remove",
  );
  assert.match(removeHandler, /requireAdmin/);
  assert.doesNotMatch(removeHandler, /requireClientCanAccessProcess/);
  assert.doesNotMatch(removeHandler, /assertCanWriteDeliveredCondition/);
  const adminIdx = removeHandler.indexOf("requireAdmin");
  const deleteIdx = removeHandler.indexOf("ctx.db.delete");
  assert.ok(adminIdx >= 0 && deleteIdx > adminIdx);
});

test("client cannot remove an orphan condition", () => {
  let wrote = false;
  const outcome = adminMutationGuard({ role: "client" }, () => {
    wrote = true;
  });
  assert.equal(outcome.threw, true);
  assert.equal(outcome.wrote, false);
  assert.equal(wrote, false);
});

test("other-company client is denied from removing a condition", () => {
  let wrote = false;
  const outcome = adminMutationGuard({ role: "client" }, () => {
    wrote = true;
  });
  assert.equal(outcome.threw, true);
  assert.equal(outcome.wrote, false);
  assert.equal(wrote, false);
  assert.equal(viewerCanAccessProcess("client", COMPANY_A, PROCESS_B), false);
});

test("admin can remove live and orphan conditions", () => {
  let liveWrote = false;
  const live = adminMutationGuard({ role: "admin" }, () => {
    liveWrote = true;
  });
  assert.equal(live.threw, false);
  assert.equal(live.wrote, true);
  assert.equal(liveWrote, true);

  let orphanWrote = false;
  const orphan = adminMutationGuard({ role: "admin" }, () => {
    orphanWrote = true;
  });
  assert.equal(orphan.threw, false);
  assert.equal(orphan.wrote, true);
  assert.equal(orphanWrote, true);

  const removeHandler = exportedHandler(
    convexSource("convex/documentDeliveredConditions.ts"),
    "remove",
  );
  assert.match(removeHandler, /requireAdmin/);
  assert.doesNotMatch(removeHandler, /assertCanWriteOrphanedCondition/);
});

test("client toggle on an orphan condition is denied", () => {
  const sameCompany = tryOrphanToggle("client");
  assert.equal(sameCompany.threw, true);
  assert.equal(sameCompany.wrote, false);
  assert.match(sameCompany.message ?? "", /Document not found/);

  const otherCompany = tryOrphanToggle("client");
  assert.equal(otherCompany.threw, true);
  assert.equal(otherCompany.wrote, false);

  const admin = tryOrphanToggle("admin");
  assert.equal(admin.threw, false);
  assert.equal(admin.wrote, true);

  assert.throws(
    () =>
      assertCanWriteOrphanedCondition({
        documentMissing: false,
        processMissing: true,
        role: "client",
      }),
    /Access denied/,
  );
  assert.doesNotThrow(() =>
    assertCanWriteOrphanedCondition({
      documentMissing: false,
      processMissing: true,
      role: "admin",
    }),
  );

  const source = convexSource("convex/documentDeliveredConditions.ts");
  const toggleHandler = exportedHandler(source, "toggleFulfillment");
  assert.match(toggleHandler, /assertCanWriteDeliveredCondition/);
  assert.doesNotMatch(toggleHandler, /requireAdmin/);
  assert.match(
    source,
    /function assertCanWriteDeliveredCondition[\s\S]*assertCanWriteOrphanedCondition/,
  );
  assert.doesNotMatch(
    toggleHandler,
    /if \(!document\) \{\s*throw new Error\("Document not found"\)/,
  );
});

test("live-doc client toggle still uses the tenant process check, not admin-only", () => {
  assert.doesNotThrow(() =>
    assertCanWriteOrphanedCondition({
      documentMissing: false,
      processMissing: false,
      role: "client",
    }),
  );

  assert.equal(viewerCanAccessProcess("client", COMPANY_A, PROCESS_A), true);
  assert.equal(viewerCanAccessProcess("client", COMPANY_A, PROCESS_B), false);
  assert.equal(viewerCanAccessProcess("admin", COMPANY_A, PROCESS_B), true);

  const source = convexSource("convex/documentDeliveredConditions.ts");
  const toggleHandler = exportedHandler(source, "toggleFulfillment");
  assert.match(toggleHandler, /assertCanWriteDeliveredCondition/);
  assert.doesNotMatch(toggleHandler, /requireAdmin/);
  assert.match(
    source,
    /function assertCanWriteDeliveredCondition[\s\S]*requireClientCanAccessProcess/,
  );
  assert.match(
    source,
    /if \(document && process\) \{\s*await requireClientCanAccessProcess/,
  );
});

test("linkedProcessCountFromDeleteError reads ConvexError count for the company-delete toast", () => {
  assert.equal(
    linkedProcessCountFromDeleteError({
      data: { code: COMPANY_HAS_PROCESSES_CODE, count: 3 },
    }),
    3,
  );
  assert.equal(
    linkedProcessCountFromDeleteError({
      message: JSON.stringify({
        code: COMPANY_HAS_PROCESSES_CODE,
        count: 1,
      }),
    }),
    1,
  );
  assert.equal(
    linkedProcessCountFromDeleteError(new Error("Erro ao excluir empresa")),
    null,
  );
  assert.equal(
    companyDeleteErrorMessage(
      { data: { code: COMPANY_HAS_PROCESSES_CODE, count: 2 } },
      (key, values) =>
        key === "cannotDeleteLinked"
          ? `linked-${values?.count}`
          : "generic",
    ),
    "linked-2",
  );
});

test("companies delete UI toasts the refusal reason and does not use native alert or a second confirm", () => {
  const client = convexSource(
    "app/[locale]/(dashboard)/companies/companies-client.tsx",
  );
  const table = convexSource("components/companies/companies-table.tsx");
  const pt = convexSource("messages/pt.json");
  const en = convexSource("messages/en.json");

  assert.match(client, /companyDeleteErrorMessage/);
  assert.match(client, /from "sonner"/);
  assert.match(client, /toast\.error\(message/);
  assert.doesNotMatch(client, /\balert\s*\(/);
  assert.doesNotMatch(client, /\bconfirm\s*\(/);
  assert.match(table, /from "sonner"/);
  assert.match(table, /toast\.error\(message/);
  assert.match(table, /setDeleteDialogDismissed\(true\)/);
  assert.match(
    table,
    /open=\{deleteConfirmation\.isOpen && !deleteDialogDismissed\}/,
  );
  assert.match(table, /entityName:\s*t\("entityName"\)/);
  assert.match(table, /description=\{t\("deleteConfirm"\)\}/);
  assert.match(
    pt,
    /Esta empresa está ligada a \{count, plural, one \{# processo\} other \{# processos\}\} e não pode ser excluída/,
  );
  assert.match(
    en,
    /This company is linked to \{count, plural, one \{# process\} other \{# processes\}\} and cannot be deleted/,
  );
});
