/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLogs from "../activityLogs.js";
import type * as appointmentReminders from "../appointmentReminders.js";
import type * as auth from "../auth.js";
import type * as bulkOperations from "../bulkOperations.js";
import type * as caseStatuses from "../caseStatuses.js";
import type * as cboCodes from "../cboCodes.js";
import type * as cities from "../cities.js";
import type * as companies from "../companies.js";
import type * as consulates from "../consulates.js";
import type * as countries from "../countries.js";
import type * as cron from "../cron.js";
import type * as dashboard from "../dashboard.js";
import type * as documentRequirements from "../documentRequirements.js";
import type * as documentTemplates from "../documentTemplates.js";
import type * as documentTypes from "../documentTypes.js";
import type * as documents from "../documents.js";
import type * as documentsDelivered from "../documentsDelivered.js";
import type * as economicActivities from "../economicActivities.js";
import type * as exports from "../exports.js";
import type * as http from "../http.js";
import type * as individualProcessStatuses from "../individualProcessStatuses.js";
import type * as individualProcesses from "../individualProcesses.js";
import type * as legalFrameworks from "../legalFrameworks.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_documentChecklist from "../lib/documentChecklist.js";
import type * as lib_processHistory from "../lib/processHistory.js";
import type * as lib_statusCalculation from "../lib/statusCalculation.js";
import type * as lib_statusManagement from "../lib/statusManagement.js";
import type * as lib_statusValidation from "../lib/statusValidation.js";
import type * as lib_stringUtils from "../lib/stringUtils.js";
import type * as mainProcesses from "../mainProcesses.js";
import type * as migrations_addDateToIndividualProcessStatuses from "../migrations/addDateToIndividualProcessStatuses.js";
import type * as migrations_addOrderNumberToCaseStatuses from "../migrations/addOrderNumberToCaseStatuses.js";
import type * as migrations_addProcessTypesLegalFrameworksJunction from "../migrations/addProcessTypesLegalFrameworksJunction.js";
import type * as migrations_importPeopleCsv from "../migrations/importPeopleCsv.js";
import type * as migrations_linkPeopleToCompanies from "../migrations/linkPeopleToCompanies.js";
import type * as migrations_migrateIndividualProcessStatuses from "../migrations/migrateIndividualProcessStatuses.js";
import type * as migrations_migrateToCaseStatuses from "../migrations/migrateToCaseStatuses.js";
import type * as migrations_removeConsulateNameField from "../migrations/removeConsulateNameField.js";
import type * as migrations_removeProcessTypeCodeCategory from "../migrations/removeProcessTypeCodeCategory.js";
import type * as migrations_removeProcessTypeIdFromLegalFrameworks from "../migrations/removeProcessTypeIdFromLegalFrameworks.js";
import type * as migrations_verifyImport from "../migrations/verifyImport.js";
import type * as myFunctions from "../myFunctions.js";
import type * as notifications from "../notifications.js";
import type * as passports from "../passports.js";
import type * as people from "../people.js";
import type * as peopleCompanies from "../peopleCompanies.js";
import type * as processHistory from "../processHistory.js";
import type * as processRequests from "../processRequests.js";
import type * as processTypes from "../processTypes.js";
import type * as seedCaseStatuses from "../seedCaseStatuses.js";
import type * as seedCboCodes from "../seedCboCodes.js";
import type * as seedCompanies from "../seedCompanies.js";
import type * as seedCountries from "../seedCountries.js";
import type * as seedInitialAdmin from "../seedInitialAdmin.js";
import type * as states from "../states.js";
import type * as tasks from "../tasks.js";
import type * as userProfiles from "../userProfiles.js";
import type * as verifyCompanies from "../verifyCompanies.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activityLogs: typeof activityLogs;
  appointmentReminders: typeof appointmentReminders;
  auth: typeof auth;
  bulkOperations: typeof bulkOperations;
  caseStatuses: typeof caseStatuses;
  cboCodes: typeof cboCodes;
  cities: typeof cities;
  companies: typeof companies;
  consulates: typeof consulates;
  countries: typeof countries;
  cron: typeof cron;
  dashboard: typeof dashboard;
  documentRequirements: typeof documentRequirements;
  documentTemplates: typeof documentTemplates;
  documentTypes: typeof documentTypes;
  documents: typeof documents;
  documentsDelivered: typeof documentsDelivered;
  economicActivities: typeof economicActivities;
  exports: typeof exports;
  http: typeof http;
  individualProcessStatuses: typeof individualProcessStatuses;
  individualProcesses: typeof individualProcesses;
  legalFrameworks: typeof legalFrameworks;
  "lib/auth": typeof lib_auth;
  "lib/documentChecklist": typeof lib_documentChecklist;
  "lib/processHistory": typeof lib_processHistory;
  "lib/statusCalculation": typeof lib_statusCalculation;
  "lib/statusManagement": typeof lib_statusManagement;
  "lib/statusValidation": typeof lib_statusValidation;
  "lib/stringUtils": typeof lib_stringUtils;
  mainProcesses: typeof mainProcesses;
  "migrations/addDateToIndividualProcessStatuses": typeof migrations_addDateToIndividualProcessStatuses;
  "migrations/addOrderNumberToCaseStatuses": typeof migrations_addOrderNumberToCaseStatuses;
  "migrations/addProcessTypesLegalFrameworksJunction": typeof migrations_addProcessTypesLegalFrameworksJunction;
  "migrations/importPeopleCsv": typeof migrations_importPeopleCsv;
  "migrations/linkPeopleToCompanies": typeof migrations_linkPeopleToCompanies;
  "migrations/migrateIndividualProcessStatuses": typeof migrations_migrateIndividualProcessStatuses;
  "migrations/migrateToCaseStatuses": typeof migrations_migrateToCaseStatuses;
  "migrations/removeConsulateNameField": typeof migrations_removeConsulateNameField;
  "migrations/removeProcessTypeCodeCategory": typeof migrations_removeProcessTypeCodeCategory;
  "migrations/removeProcessTypeIdFromLegalFrameworks": typeof migrations_removeProcessTypeIdFromLegalFrameworks;
  "migrations/verifyImport": typeof migrations_verifyImport;
  myFunctions: typeof myFunctions;
  notifications: typeof notifications;
  passports: typeof passports;
  people: typeof people;
  peopleCompanies: typeof peopleCompanies;
  processHistory: typeof processHistory;
  processRequests: typeof processRequests;
  processTypes: typeof processTypes;
  seedCaseStatuses: typeof seedCaseStatuses;
  seedCboCodes: typeof seedCboCodes;
  seedCompanies: typeof seedCompanies;
  seedCountries: typeof seedCountries;
  seedInitialAdmin: typeof seedInitialAdmin;
  states: typeof states;
  tasks: typeof tasks;
  userProfiles: typeof userProfiles;
  verifyCompanies: typeof verifyCompanies;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
