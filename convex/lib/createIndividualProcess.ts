import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  generateDocumentChecklist,
  generateDocumentChecklistByLegalFramework,
  autoReuseCompanyDocuments,
} from "./documentChecklist";
import { logStatusChange } from "./processHistory";
import { normalizeStatusDateTime } from "./statusDateTime";

function getFullName(person: {
  givenNames: string;
  middleName?: string;
  surname?: string;
}): string {
  return [person.givenNames, person.middleName, person.surname]
    .filter(Boolean)
    .join(" ");
}

/**
 * Shared input for creating an individual process. Mirrors the public
 * `individualProcesses.create` mutation args, plus the request-derived fields
 * (visa receipt location, foreign residence, professional experience narrative).
 */
export interface CreateIndividualProcessInput {
  collectiveProcessId?: Id<"collectiveProcesses">;
  dateProcess?: string;
  personId: Id<"people">;
  passportId?: Id<"passports">;
  applicantId?: Id<"people">;
  companyApplicantId?: Id<"companies">;
  userApplicantId?: Id<"people">;
  userApplicantCompanyId?: Id<"companies">;
  consulateId?: Id<"consulates">;
  caseStatusId?: Id<"caseStatuses">;
  status?: string;
  processTypeId?: Id<"processTypes">;
  legalFrameworkId?: Id<"legalFrameworks">;
  funcao?: string;
  cboId?: Id<"cboCodes">;
  qualification?: string;
  professionalExperienceSince?: string;
  mreOfficeNumber?: string;
  douNumber?: string;
  douSection?: string;
  douPage?: string;
  douDate?: string;
  protocolNumber?: string;
  rnmNumber?: string;
  rnmProtocol?: string;
  rnmDeadline?: string;
  appointmentDateTime?: string;
  deadlineDate?: string;
  deadlineUnit?: string;
  deadlineQuantity?: number;
  deadlineSpecificDate?: string;
  lastSalaryCurrency?: string;
  lastSalaryAmount?: number;
  exchangeRateToBRL?: number;
  salaryInBRL?: number;
  monthlyAmountToReceive?: number;
  isActive?: boolean;
  processStatus?: "Atual" | "Anterior";
  urgent?: boolean;
  // Request-derived fields (visa receipt + foreign residence + professional experience)
  visaReceiptLocation?: "brazil" | "abroad";
  residenceCountryCode?: string;
  residenceCountryName?: string;
  residenceStateCode?: string;
  residenceCity?: string;
  residenceSince?: string;
  residenceAddressAbroad?: string;
  consularPost?: string;
  professionalExperience?: string;
}

/**
 * Core logic to create an individual process, including the initial active
 * status record, status history, and auto-generated document checklists.
 *
 * This mirrors `individualProcesses.create` so that approving a process request
 * yields a fully-populated process identical to one created by an admin. The
 * caller is responsible for authorization (e.g. `requireAdmin`).
 */
export async function createIndividualProcessCore(
  ctx: MutationCtx,
  args: CreateIndividualProcessInput,
  userId: Id<"users">
): Promise<Id<"individualProcesses">> {
  const now = Date.now();

  // Get case status - default to "em_preparacao" if not provided
  let caseStatus;
  if (args.caseStatusId) {
    caseStatus = await ctx.db.get(args.caseStatusId);
    if (!caseStatus) {
      throw new Error("Case status not found");
    }
  } else {
    caseStatus = await ctx.db
      .query("caseStatuses")
      .withIndex("by_code", (q) => q.eq("code", "em_preparacao"))
      .first();

    if (!caseStatus) {
      throw new Error("Default status 'em_preparacao' not found in database");
    }
  }

  const statusString = args.status || caseStatus.code;

  const processId = await ctx.db.insert("individualProcesses", {
    collectiveProcessId: args.collectiveProcessId,
    dateProcess: args.dateProcess,
    personId: args.personId,
    passportId: args.passportId,
    applicantId: args.applicantId,
    companyApplicantId: args.companyApplicantId,
    userApplicantId: args.userApplicantId,
    userApplicantCompanyId: args.userApplicantCompanyId,
    consulateId: args.consulateId,
    caseStatusId: caseStatus._id,
    status: statusString,
    processTypeId: args.processTypeId,
    legalFrameworkId: args.legalFrameworkId,
    funcao: args.funcao,
    cboId: args.cboId,
    qualification: args.qualification,
    professionalExperienceSince: args.professionalExperienceSince,
    mreOfficeNumber: args.mreOfficeNumber,
    douNumber: args.douNumber,
    douSection: args.douSection,
    douPage: args.douPage,
    douDate: args.douDate,
    protocolNumber: args.protocolNumber,
    rnmNumber: args.rnmNumber,
    rnmProtocol: args.rnmProtocol,
    rnmDeadline: args.rnmDeadline,
    appointmentDateTime: args.appointmentDateTime,
    deadlineDate: args.deadlineDate,
    deadlineUnit: args.deadlineUnit,
    deadlineQuantity: args.deadlineQuantity,
    deadlineSpecificDate: args.deadlineSpecificDate,
    lastSalaryCurrency: args.lastSalaryCurrency,
    lastSalaryAmount: args.lastSalaryAmount,
    exchangeRateToBRL: args.exchangeRateToBRL,
    salaryInBRL: args.salaryInBRL,
    monthlyAmountToReceive: args.monthlyAmountToReceive,
    // Request-derived fields
    visaReceiptLocation: args.visaReceiptLocation,
    residenceCountryCode: args.residenceCountryCode,
    residenceCountryName: args.residenceCountryName,
    residenceStateCode: args.residenceStateCode,
    residenceCity: args.residenceCity,
    residenceSince: args.residenceSince,
    residenceAddressAbroad: args.residenceAddressAbroad,
    consularPost: args.consularPost,
    professionalExperience: args.professionalExperience,
    isActive:
      args.processStatus !== "Anterior" ? (args.isActive ?? true) : false,
    processStatus: args.processStatus ?? "Atual",
    urgent: args.urgent,
    createdAt: now,
    updatedAt: now,
  });

  // Create initial status record in the status system with current date
  try {
    const statusDate = normalizeStatusDateTime(args.dateProcess, now);
    await ctx.db.insert("individualProcessStatuses", {
      individualProcessId: processId,
      caseStatusId: caseStatus._id,
      statusName: caseStatus.name,
      date: statusDate,
      isActive: true,
      notes: `Initial status: ${caseStatus.name}`,
      changedBy: userId,
      changedAt: now,
      createdAt: now,
    });
  } catch (error) {
    console.error("Failed to create initial status record:", error);
  }

  // Log initial status to history
  try {
    await logStatusChange(
      ctx,
      processId,
      undefined,
      caseStatus.name,
      `Individual process created with status: ${caseStatus.name}`
    );
  } catch (error) {
    console.error("Failed to log initial status to history:", error);
  }

  // Auto-generate document checklist (template-based)
  try {
    await generateDocumentChecklist(ctx, processId);
  } catch (error) {
    console.error("Failed to generate document checklist:", error);
  }

  // Auto-generate document checklist based on legal framework associations
  try {
    await generateDocumentChecklistByLegalFramework(ctx, processId);
  } catch (error) {
    console.error(
      "Failed to generate document checklist by legal framework:",
      error
    );
  }

  // Auto-reuse company documents from other processes of the same company
  if (args.companyApplicantId) {
    try {
      await autoReuseCompanyDocuments(ctx, processId);
    } catch (error) {
      console.error("Failed to auto-reuse company documents:", error);
    }
  }

  // Log activity (non-blocking)
  try {
    const [person, collectiveProcess] = await Promise.all([
      ctx.db.get(args.personId),
      args.collectiveProcessId
        ? ctx.db.get(args.collectiveProcessId)
        : Promise.resolve(null),
    ]);

    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId,
      action: "created",
      entityType: "individualProcess",
      entityId: processId,
      details: {
        personName: person ? getFullName(person) : undefined,
        collectiveProcessReference: collectiveProcess?.referenceNumber,
        caseStatusName: caseStatus.name,
        caseStatusId: caseStatus._id,
        legalFrameworkId: args.legalFrameworkId,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }

  return processId;
}
