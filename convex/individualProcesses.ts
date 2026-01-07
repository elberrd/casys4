import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { generateDocumentChecklist } from "./lib/documentChecklist";
import { logStatusChange } from "./lib/processHistory";
import { isValidIndividualStatusTransition } from "./lib/statusValidation";
import { autoGenerateTasksOnStatusChange } from "./tasks";
import { internal } from "./_generated/api";
import { normalizeString } from "./lib/stringUtils";
import { ensureSingleActiveStatus, getEmPreparacaoStatus } from "./lib/statusManagement";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Query to list all individual processes with optional filters
 * Access control: Admins see all processes, clients see only their company's processes (via collectiveProcess.companyId)
 */
export const list = query({
  args: {
    collectiveProcessId: v.optional(v.id("collectiveProcesses")),
    personId: v.optional(v.id("people")),
    status: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    let results;

    // Apply filters
    if (args.collectiveProcessId !== undefined) {
      const collectiveProcessId = args.collectiveProcessId;
      results = await ctx.db
        .query("individualProcesses")
        .withIndex("by_collectiveProcess", (q) =>
          q.eq("collectiveProcessId", collectiveProcessId),
        )
        .collect();
    } else if (args.personId !== undefined) {
      const personId = args.personId;
      results = await ctx.db
        .query("individualProcesses")
        .withIndex("by_person", (q) => q.eq("personId", personId))
        .collect();
    } else if (args.status !== undefined) {
      const status = args.status;
      results = await ctx.db
        .query("individualProcesses")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else if (args.isActive !== undefined) {
      const isActive = args.isActive;
      results = await ctx.db
        .query("individualProcesses")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
    } else {
      results = await ctx.db.query("individualProcesses").collect();
    }

    // Filter by additional criteria if needed
    let filteredResults = results;
    if (args.collectiveProcessId === undefined && args.isActive !== undefined) {
      filteredResults = results.filter((r) => r.isActive === args.isActive);
    }
    if (args.personId === undefined && args.status !== undefined) {
      filteredResults = filteredResults.filter((r) => r.status === args.status);
    }

    // Apply role-based access control via collectiveProcess.companyId
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Filter by collectiveProcess.companyId - fetch collectiveProcesses for each result
      const filteredByCompany = await Promise.all(
        filteredResults.map(async (process) => {
          if (!process.collectiveProcessId) return null;
          const collectiveProcess = await ctx.db.get(process.collectiveProcessId);
          if (collectiveProcess && collectiveProcess.companyId === userProfile.companyId) {
            return process;
          }
          return null;
        })
      );

      filteredResults = filteredByCompany.filter((p) => p !== null) as typeof filteredResults;
    }

    // Enrich with related data including active status and case status
    const enrichedResults = await Promise.all(
      filteredResults.map(async (process) => {
        const [rawPerson, collectiveProcess, legalFramework, cbo, activeStatus, caseStatus, passport, processType, companyApplicant, userApplicant, consulate, notesCount] = await Promise.all([
          ctx.db.get(process.personId),
          process.collectiveProcessId ? ctx.db.get(process.collectiveProcessId) : null,
          process.legalFrameworkId ? ctx.db.get(process.legalFrameworkId) : null,
          process.cboId ? ctx.db.get(process.cboId) : null,
          // Get active status from new status system
          ctx.db
            .query("individualProcessStatuses")
            .withIndex("by_individualProcess_active", (q) =>
              q.eq("individualProcessId", process._id).eq("isActive", true)
            )
            .first(),
          // Get case status details
          process.caseStatusId ? ctx.db.get(process.caseStatusId) : null,
          // Get passport details if passportId exists
          process.passportId ? ctx.db.get(process.passportId) : null,
          // Get process type details if processTypeId exists
          process.processTypeId ? ctx.db.get(process.processTypeId) : null,
          // Get company applicant details if companyApplicantId exists
          process.companyApplicantId ? ctx.db.get(process.companyApplicantId) : null,
          // Get user applicant details if userApplicantId exists
          process.userApplicantId ? ctx.db.get(process.userApplicantId) : null,
          // Get consulate details if consulateId exists
          process.consulateId ? ctx.db.get(process.consulateId) : null,
          // Get notes count for this individual process
          ctx.db
            .query("notes")
            .withIndex("by_individualProcess_active", (q) =>
              q.eq("individualProcessId", process._id).eq("isActive", true)
            )
            .collect()
            .then((notes) => notes.length),
        ]);

        // Enrich person with nationality
        let person = rawPerson;
        if (rawPerson) {
          const nationality = rawPerson.nationalityId
            ? await ctx.db.get(rawPerson.nationalityId)
            : null;
          person = {
            ...rawPerson,
            nationality,
          } as any;
        }

        // If passport exists, enrich it with issuing country
        let enrichedPassport = null;
        if (passport) {
          const issuingCountry = passport.issuingCountryId
            ? await ctx.db.get(passport.issuingCountryId)
            : null;
          enrichedPassport = {
            ...passport,
            issuingCountry,
          };
        }

        // If consulate exists, enrich it with city, state, and country
        let enrichedConsulate = null;
        if (consulate) {
          const city = consulate.cityId ? await ctx.db.get(consulate.cityId) : null;
          let state = null;
          let country = null;
          if (city) {
            state = city.stateId ? await ctx.db.get(city.stateId) : null;
            country = city.countryId ? await ctx.db.get(city.countryId) : null;
          }
          enrichedConsulate = {
            ...consulate,
            city,
            state,
            country,
          };
        }

        // Enrich activeStatus with resolved reference field names
        let enrichedActiveStatus = activeStatus;
        if (activeStatus?.filledFieldsData) {
          const filledData = activeStatus.filledFieldsData;
          const enrichedData: Record<string, any> = {};

          // Resolve reference field IDs to readable names
          for (const [fieldName, fieldValue] of Object.entries(filledData)) {
            if (fieldValue === null || fieldValue === undefined) {
              enrichedData[fieldName] = fieldValue;
              continue;
            }

            // Handle reference fields
            if (fieldName === "passportId" && typeof fieldValue === "string") {
              const passportDoc = await ctx.db.get(fieldValue as Id<"passports">);
              enrichedData[fieldName] = passportDoc?.passportNumber || fieldValue;
            } else if (fieldName === "applicantId" && typeof fieldValue === "string") {
              const personDoc = await ctx.db.get(fieldValue as Id<"people">);
              enrichedData[fieldName] = personDoc?.fullName || fieldValue;
            } else if (fieldName === "personId" && typeof fieldValue === "string") {
              const personDoc = await ctx.db.get(fieldValue as Id<"people">);
              enrichedData[fieldName] = personDoc?.fullName || fieldValue;
            } else if (fieldName === "processTypeId" && typeof fieldValue === "string") {
              const processTypeDoc = await ctx.db.get(fieldValue as Id<"processTypes">);
              enrichedData[fieldName] = processTypeDoc?.name || fieldValue;
            } else if (fieldName === "legalFrameworkId" && typeof fieldValue === "string") {
              const legalFrameworkDoc = await ctx.db.get(fieldValue as Id<"legalFrameworks">);
              enrichedData[fieldName] = legalFrameworkDoc?.name || fieldValue;
            } else if (fieldName === "cboId" && typeof fieldValue === "string") {
              const cboDoc = await ctx.db.get(fieldValue as Id<"cboCodes">);
              enrichedData[fieldName] = cboDoc ? `${cboDoc.code} - ${cboDoc.title}` : fieldValue;
            } else {
              // Keep non-reference fields as-is
              enrichedData[fieldName] = fieldValue;
            }
          }

          enrichedActiveStatus = {
            ...activeStatus,
            filledFieldsData: enrichedData,
          };
        }

        return {
          ...process,
          person,
          collectiveProcess,
          legalFramework,
          cbo,
          activeStatus: enrichedActiveStatus,
          caseStatus, // NEW: Include full case status object with name, nameEn, color, etc.
          passport: enrichedPassport,
          processType, // Include process type details
          companyApplicant, // Include company applicant details
          userApplicant, // Include user applicant details
          consulate: enrichedConsulate, // Include consulate with city, state, country
          notesCount, // Include notes count for the process
        };
      }),
    );

    // Apply search filter
    let searchFilteredResults = enrichedResults;
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      searchFilteredResults = enrichedResults.filter((item) => {
        const personName = item.person?.fullName ? normalizeString(item.person.fullName) : "";
        const protocolNumber = item.protocolNumber ? normalizeString(item.protocolNumber) : "";
        const mreOfficeNumber = item.mreOfficeNumber ? normalizeString(item.mreOfficeNumber) : "";
        const rnmNumber = item.rnmNumber ? normalizeString(item.rnmNumber) : "";

        return (
          personName.includes(searchNormalized) ||
          protocolNumber.includes(searchNormalized) ||
          mreOfficeNumber.includes(searchNormalized) ||
          rnmNumber.includes(searchNormalized)
        );
      });
    }

    return searchFilteredResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Query to get individual process by ID with related data
 * Access control: Admins can view any process, clients can only view their company's processes
 */
export const get = query({
  args: { id: v.id("individualProcesses") },
  handler: async (ctx, { id }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const process = await ctx.db.get(id);
    if (!process) return null;

    const [rawPerson, collectiveProcess, legalFramework, cbo, activeStatus, caseStatus, passport, applicant, companyApplicant, userApplicant, consulate, processType] = await Promise.all([
      ctx.db.get(process.personId),
      process.collectiveProcessId ? ctx.db.get(process.collectiveProcessId) : null,
      process.legalFrameworkId ? ctx.db.get(process.legalFrameworkId) : null,
      process.cboId ? ctx.db.get(process.cboId) : null,
      // Get active status from new status system
      ctx.db
        .query("individualProcessStatuses")
        .withIndex("by_individualProcess_active", (q) =>
          q.eq("individualProcessId", id).eq("isActive", true)
        )
        .first(),
      // Get case status details
      process.caseStatusId ? ctx.db.get(process.caseStatusId) : null,
      // Get passport details if passportId exists
      process.passportId ? ctx.db.get(process.passportId) : null,
      // Get applicant details if applicantId exists (DEPRECATED)
      process.applicantId ? ctx.db.get(process.applicantId) : null,
      // Get company applicant details if companyApplicantId exists
      process.companyApplicantId ? ctx.db.get(process.companyApplicantId) : null,
      // Get user applicant details if userApplicantId exists
      process.userApplicantId ? ctx.db.get(process.userApplicantId) : null,
      // Get consulate details if consulateId exists
      process.consulateId ? ctx.db.get(process.consulateId) : null,
      // Get process type details if processTypeId exists
      process.processTypeId ? ctx.db.get(process.processTypeId) : null,
    ]);

    // Enrich person with nationality
    let person = rawPerson;
    if (rawPerson) {
      const nationality = rawPerson.nationalityId
        ? await ctx.db.get(rawPerson.nationalityId)
        : null;
      person = {
        ...rawPerson,
        nationality,
      } as any;
    }

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId || !collectiveProcess || collectiveProcess.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view this individual process"
        );
      }
    }

    // If passport exists, enrich it with issuing country
    let enrichedPassport = null;
    if (passport) {
      const issuingCountry = passport.issuingCountryId
        ? await ctx.db.get(passport.issuingCountryId)
        : null;
      enrichedPassport = {
        ...passport,
        issuingCountry,
      };
    }

    // If applicant exists, enrich with company information (DEPRECATED)
    let enrichedApplicant = null;
    if (applicant) {
      // Get applicant's current company relationship
      const applicantCompany = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_person", (q) => q.eq("personId", applicant._id))
        .filter((q) => q.eq(q.field("isCurrent"), true))
        .first();

      let company = null;
      if (applicantCompany?.companyId) {
        company = await ctx.db.get(applicantCompany.companyId);
      }

      enrichedApplicant = {
        ...applicant,
        company,
      };
    }

    // If user applicant exists, enrich with company information
    let enrichedUserApplicant = null;
    if (userApplicant) {
      // Get user applicant's current company relationship
      const userApplicantCompany = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_person", (q) => q.eq("personId", userApplicant._id))
        .filter((q) => q.eq(q.field("isCurrent"), true))
        .first();

      let company = null;
      if (userApplicantCompany?.companyId) {
        company = await ctx.db.get(userApplicantCompany.companyId);
      }

      enrichedUserApplicant = {
        ...userApplicant,
        company,
      };
    }

    // If consulate exists, enrich it with city, state, and country
    let enrichedConsulate = null;
    if (consulate) {
      const city = consulate.cityId ? await ctx.db.get(consulate.cityId) : null;
      let state = null;
      let country = null;
      if (city) {
        state = city.stateId ? await ctx.db.get(city.stateId) : null;
        country = city.countryId ? await ctx.db.get(city.countryId) : null;
      }
      enrichedConsulate = {
        ...consulate,
        city,
        state,
        country,
      };
    }

    // Enrich activeStatus with resolved reference field names
    let enrichedActiveStatus = activeStatus;
    if (activeStatus?.filledFieldsData) {
      const filledData = activeStatus.filledFieldsData;
      const enrichedData: Record<string, any> = {};

      // Resolve reference field IDs to readable names
      for (const [fieldName, fieldValue] of Object.entries(filledData)) {
        if (fieldValue === null || fieldValue === undefined) {
          enrichedData[fieldName] = fieldValue;
          continue;
        }

        // Handle reference fields
        if (fieldName === "passportId" && typeof fieldValue === "string") {
          const passportDoc = await ctx.db.get(fieldValue as Id<"passports">);
          enrichedData[fieldName] = passportDoc?.passportNumber || fieldValue;
        } else if (fieldName === "applicantId" && typeof fieldValue === "string") {
          const personDoc = await ctx.db.get(fieldValue as Id<"people">);
          enrichedData[fieldName] = personDoc?.fullName || fieldValue;
        } else if (fieldName === "personId" && typeof fieldValue === "string") {
          const personDoc = await ctx.db.get(fieldValue as Id<"people">);
          enrichedData[fieldName] = personDoc?.fullName || fieldValue;
        } else if (fieldName === "processTypeId" && typeof fieldValue === "string") {
          const processTypeDoc = await ctx.db.get(fieldValue as Id<"processTypes">);
          enrichedData[fieldName] = processTypeDoc?.name || fieldValue;
        } else if (fieldName === "legalFrameworkId" && typeof fieldValue === "string") {
          const legalFrameworkDoc = await ctx.db.get(fieldValue as Id<"legalFrameworks">);
          enrichedData[fieldName] = legalFrameworkDoc?.name || fieldValue;
        } else if (fieldName === "cboId" && typeof fieldValue === "string") {
          const cboDoc = await ctx.db.get(fieldValue as Id<"cboCodes">);
          enrichedData[fieldName] = cboDoc ? `${cboDoc.code} - ${cboDoc.title}` : fieldValue;
        } else {
          // Keep non-reference fields as-is
          enrichedData[fieldName] = fieldValue;
        }
      }

      enrichedActiveStatus = {
        ...activeStatus,
        filledFieldsData: enrichedData,
      };
    }

    return {
      ...process,
      person,
      collectiveProcess,
      legalFramework,
      cbo,
      activeStatus: enrichedActiveStatus,
      caseStatus, // NEW: Include full case status object with name, nameEn, color, etc.
      passport: enrichedPassport,
      applicant: enrichedApplicant, // DEPRECATED: Include applicant with company
      companyApplicant, // NEW: Include company applicant
      userApplicant: enrichedUserApplicant, // NEW: Include user applicant with company
      consulate: enrichedConsulate, // Include consulate with city, state, country
      processType, // Include process type details
    };
  },
});

/**
 * Mutation to create individual process (admin only)
 * Updated to use caseStatusId instead of status string
 */
export const create = mutation({
  args: {
    collectiveProcessId: v.optional(v.id("collectiveProcesses")),
    dateProcess: v.optional(v.string()), // ISO date format YYYY-MM-DD - Process date
    personId: v.id("people"),
    passportId: v.optional(v.id("passports")), // Reference to the person's passport
    applicantId: v.optional(v.id("people")), // DEPRECATED: Reference to applicant (person with company)
    companyApplicantId: v.optional(v.id("companies")), // Company applicant (optional)
    userApplicantId: v.optional(v.id("people")), // User applicant (optional, filtered by company)
    consulateId: v.optional(v.id("consulates")), // Consulate for this individual process (optional)
    caseStatusId: v.optional(v.id("caseStatuses")), // Optional - defaults to "em_preparacao"
    status: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility
    processTypeId: v.optional(v.id("processTypes")), // Process type for cascading legal framework filtering
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    funcao: v.optional(v.string()),
    cboId: v.optional(v.id("cboCodes")),
    qualification: v.optional(v.string()),
    professionalExperienceSince: v.optional(v.string()),
    mreOfficeNumber: v.optional(v.string()),
    douNumber: v.optional(v.string()),
    douSection: v.optional(v.string()),
    douPage: v.optional(v.string()),
    douDate: v.optional(v.string()),
    protocolNumber: v.optional(v.string()),
    rnmNumber: v.optional(v.string()),
    rnmProtocol: v.optional(v.string()),
    rnmDeadline: v.optional(v.string()),
    appointmentDateTime: v.optional(v.string()),
    deadlineDate: v.optional(v.string()),
    deadlineUnit: v.optional(v.string()),
    deadlineQuantity: v.optional(v.number()),
    deadlineSpecificDate: v.optional(v.string()),
    lastSalaryCurrency: v.optional(v.string()),
    lastSalaryAmount: v.optional(v.number()),
    exchangeRateToBRL: v.optional(v.number()),
    salaryInBRL: v.optional(v.number()),
    monthlyAmountToReceive: v.optional(v.number()),
    isActive: v.optional(v.boolean()), // DEPRECATED: Use processStatus instead
    processStatus: v.optional(v.union(v.literal("Atual"), v.literal("Anterior"))),
    urgent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const now = Date.now();

    // Get current user ID for status tracking
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Get case status - default to "em_preparacao" if not provided
    let caseStatus;
    if (args.caseStatusId) {
      caseStatus = await ctx.db.get(args.caseStatusId);
      if (!caseStatus) {
        throw new Error("Case status not found");
      }
    } else {
      // Default to "em_preparacao" status
      caseStatus = await ctx.db
        .query("caseStatuses")
        .withIndex("by_code", (q) => q.eq("code", "em_preparacao"))
        .first();

      if (!caseStatus) {
        throw new Error("Default status 'em_preparacao' not found in database");
      }
    }

    // For backward compatibility, derive status string from case status if not provided
    const statusString = args.status || caseStatus.code;

    const processId = await ctx.db.insert("individualProcesses", {
      collectiveProcessId: args.collectiveProcessId,
      dateProcess: args.dateProcess, // Process date (ISO format YYYY-MM-DD)
      personId: args.personId,
      passportId: args.passportId, // Store passport reference
      applicantId: args.applicantId, // DEPRECATED: Store applicant reference
      companyApplicantId: args.companyApplicantId, // Store company applicant reference
      userApplicantId: args.userApplicantId, // Store user applicant reference
      consulateId: args.consulateId, // Store consulate reference
      caseStatusId: caseStatus._id, // Store case status ID (defaults to em_preparacao)
      status: statusString, // DEPRECATED: Keep for backward compatibility
      processTypeId: args.processTypeId, // Process type for cascading filtering
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
      isActive: args.processStatus !== "Anterior" ? (args.isActive ?? true) : false,
      processStatus: args.processStatus ?? "Atual", // Default to "Atual" for new processes
      urgent: args.urgent,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial status record in the new status system with current date
    try {
      // Format current date as ISO date string (YYYY-MM-DD)
      const currentDate = new Date(now).toISOString().split('T')[0];

      // Use provided dateProcess or default to today for "em preparação" status
      const statusDate = args.dateProcess || currentDate;

      await ctx.db.insert("individualProcessStatuses", {
        individualProcessId: processId,
        caseStatusId: caseStatus._id, // Store case status ID
        statusName: caseStatus.name, // DEPRECATED: Store case status name for backward compatibility
        date: statusDate, // ISO date format YYYY-MM-DD - sync with dateProcess
        isActive: true,
        notes: `Initial status: ${caseStatus.name}`,
        changedBy: userId,
        changedAt: now,
        createdAt: now,
      });
    } catch (error) {
      // Log error but don't fail process creation
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
      // Log error but don't fail process creation
      console.error("Failed to log initial status to history:", error);
    }

    // Auto-generate document checklist
    try {
      await generateDocumentChecklist(ctx, processId);
    } catch (error) {
      // Log error but don't fail process creation
      console.error("Failed to generate document checklist:", error);
    }

    // Log activity (non-blocking)
    try {
      const [person, collectiveProcess] = await Promise.all([
        ctx.db.get(args.personId),
        args.collectiveProcessId ? ctx.db.get(args.collectiveProcessId) : Promise.resolve(null),
      ]);

      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId!,
        action: "created",
        entityType: "individualProcess",
        entityId: processId,
        details: {
          personName: person?.fullName,
          collectiveProcessReference: collectiveProcess?.referenceNumber,
          caseStatusName: caseStatus.name, // Log case status name
          caseStatusId: caseStatus._id, // Log case status ID
          legalFrameworkId: args.legalFrameworkId,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return processId;
  },
});

/**
 * Mutation to create a new individual process based on an existing one (admin only)
 * This mutation duplicates an individual process, copying specific fields while resetting others
 * The original process is marked as "Anterior" and the new process is marked as "Atual"
 */
export const createFromExisting = mutation({
  args: {
    sourceProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const now = Date.now();

    // Get current user ID for status tracking
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Get the source process
    const sourceProcess = await ctx.db.get(args.sourceProcessId);
    if (!sourceProcess) {
      throw new Error("Source process not found");
    }

    // Get the "Em Preparação" case status for the new process
    const emPreparacaoStatus = await ctx.db
      .query("caseStatuses")
      .filter((q) => q.eq(q.field("code"), "em_preparacao"))
      .first();

    if (!emPreparacaoStatus) {
      throw new Error("Em Preparação status not found");
    }

    // Format current date as ISO date string (YYYY-MM-DD)
    const currentDate = new Date(now).toISOString().split("T")[0];

    // Create the new process with copied fields
    const newProcessId = await ctx.db.insert("individualProcesses", {
      // Fields to COPY from source process
      personId: sourceProcess.personId, // Candidato
      companyApplicantId: sourceProcess.companyApplicantId, // Empresa Requerente

      // Fields to SET/RESET for new process
      dateProcess: currentDate, // Current date
      processStatus: "Atual", // New process is always "Atual"
      isActive: true, // For backward compatibility
      caseStatusId: emPreparacaoStatus._id, // Start with "Em Preparação"
      status: emPreparacaoStatus.code, // DEPRECATED: Keep for backward compatibility

      // Timestamps
      createdAt: now,
      updatedAt: now,

      // DO NOT copy: All other fields start fresh
      // - processTypeId (Tipo de Autorização)
      // - legalFrameworkId (Amparo Legal)
      // - userApplicantId (Solicitante)
      // - consulateId (Consulado)
      // - passportId (Passaporte)
      // - collectiveProcessId
      // - protocolNumber, rnmNumber, government docs, deadlines, appointments, etc.
    });

    // Create initial "Em Preparação" status record
    try {
      await ctx.db.insert("individualProcessStatuses", {
        individualProcessId: newProcessId,
        caseStatusId: emPreparacaoStatus._id,
        statusName: emPreparacaoStatus.name, // DEPRECATED but keep for compatibility
        date: currentDate,
        isActive: true,
        notes: `Initial status: ${emPreparacaoStatus.name} (created from existing process)`,
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
        newProcessId,
        undefined,
        emPreparacaoStatus.name,
        `Individual process created from existing process (source: ${args.sourceProcessId})`
      );
    } catch (error) {
      console.error("Failed to log initial status to history:", error);
    }

    // Auto-generate document checklist for new process
    try {
      await generateDocumentChecklist(ctx, newProcessId);
    } catch (error) {
      console.error("Failed to generate document checklist:", error);
    }

    // Update source process to mark it as "Anterior"
    await ctx.db.patch(args.sourceProcessId, {
      processStatus: "Anterior",
      isActive: false, // For backward compatibility
      updatedAt: now,
    });

    // Log activity for new process
    try {
      const person = await ctx.db.get(sourceProcess.personId);

      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId!,
        action: "created_from_existing",
        entityType: "individualProcess",
        entityId: newProcessId,
        details: {
          personName: person?.fullName,
          sourceProcessId: args.sourceProcessId,
          caseStatusName: emPreparacaoStatus.name,
          caseStatusId: emPreparacaoStatus._id,
        },
      });
    } catch (error) {
      console.error("Failed to log activity for new process:", error);
    }

    // Log activity for source process (marked as previous)
    try {
      const person = await ctx.db.get(sourceProcess.personId);

      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId!,
        action: "marked_as_previous",
        entityType: "individualProcess",
        entityId: args.sourceProcessId,
        details: {
          personName: person?.fullName,
          newProcessId: newProcessId,
          reason: "New process created from this process",
        },
      });
    } catch (error) {
      console.error("Failed to log activity for source process:", error);
    }

    return newProcessId;
  },
});

/**
 * Mutation to update individual process (admin only)
 * Updated to use caseStatusId instead of status string
 */
export const update = mutation({
  args: {
    id: v.id("individualProcesses"),
    dateProcess: v.optional(v.string()), // ISO date format YYYY-MM-DD - Process date
    passportId: v.optional(v.id("passports")), // Reference to the person's passport
    applicantId: v.optional(v.id("people")), // DEPRECATED: Reference to applicant (person with company)
    companyApplicantId: v.optional(v.id("companies")), // Company applicant (optional)
    userApplicantId: v.optional(v.id("people")), // User applicant (optional, filtered by company)
    consulateId: v.optional(v.id("consulates")), // Consulate for this individual process (optional)
    caseStatusId: v.optional(v.id("caseStatuses")), // NEW: Use case status ID
    status: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility
    processTypeId: v.optional(v.id("processTypes")), // Process type for cascading legal framework filtering
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    funcao: v.optional(v.string()),
    cboId: v.optional(v.id("cboCodes")),
    qualification: v.optional(v.string()),
    professionalExperienceSince: v.optional(v.string()),
    mreOfficeNumber: v.optional(v.string()),
    douNumber: v.optional(v.string()),
    douSection: v.optional(v.string()),
    douPage: v.optional(v.string()),
    douDate: v.optional(v.string()),
    protocolNumber: v.optional(v.string()),
    rnmNumber: v.optional(v.string()),
    rnmProtocol: v.optional(v.string()),
    rnmDeadline: v.optional(v.string()),
    appointmentDateTime: v.optional(v.string()),
    deadlineDate: v.optional(v.string()),
    deadlineUnit: v.optional(v.string()),
    deadlineQuantity: v.optional(v.number()),
    deadlineSpecificDate: v.optional(v.string()),
    lastSalaryCurrency: v.optional(v.string()),
    lastSalaryAmount: v.optional(v.number()),
    exchangeRateToBRL: v.optional(v.number()),
    salaryInBRL: v.optional(v.number()),
    monthlyAmountToReceive: v.optional(v.number()),
    isActive: v.optional(v.boolean()), // DEPRECATED: Use processStatus instead
    processStatus: v.optional(v.union(v.literal("Atual"), v.literal("Anterior"))),
    urgent: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Individual process not found");
    }

    // Validate that new case status exists if provided
    let newCaseStatus = null;
    if (args.caseStatusId !== undefined) {
      newCaseStatus = await ctx.db.get(args.caseStatusId);
      if (!newCaseStatus) {
        throw new Error("Case status not found");
      }
    }

    // Validate status transition if status is being updated
    const isStatusChanging = args.caseStatusId !== undefined && args.caseStatusId !== process.caseStatusId;

    if (isStatusChanging && process.status && newCaseStatus) {
      const isValid = isValidIndividualStatusTransition(
        process.status,
        newCaseStatus.code
      );

      if (!isValid) {
        throw new Error(
          `Invalid status transition from "${process.status}" to "${newCaseStatus.code}". This transition is not allowed.`
        );
      }
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Only update provided fields
    if (args.dateProcess !== undefined) updates.dateProcess = args.dateProcess;
    if (args.caseStatusId !== undefined) {
      updates.caseStatusId = args.caseStatusId; // NEW: Update case status ID
      // DEPRECATED: Keep status string in sync for backward compatibility
      if (newCaseStatus) {
        updates.status = newCaseStatus.code;
      }
    } else if (args.status !== undefined) {
      // DEPRECATED: Support old status string parameter for backward compatibility
      updates.status = args.status;
    }
    if (args.passportId !== undefined) updates.passportId = args.passportId;
    if (args.applicantId !== undefined) updates.applicantId = args.applicantId; // DEPRECATED
    if (args.companyApplicantId !== undefined) updates.companyApplicantId = args.companyApplicantId;
    if (args.userApplicantId !== undefined) updates.userApplicantId = args.userApplicantId;
    if (args.consulateId !== undefined) updates.consulateId = args.consulateId;
    if (args.processTypeId !== undefined) updates.processTypeId = args.processTypeId;
    if (args.legalFrameworkId !== undefined)
      updates.legalFrameworkId = args.legalFrameworkId;
    if (args.funcao !== undefined) updates.funcao = args.funcao;
    if (args.cboId !== undefined) updates.cboId = args.cboId;
    if (args.qualification !== undefined) updates.qualification = args.qualification;
    if (args.professionalExperienceSince !== undefined)
      updates.professionalExperienceSince = args.professionalExperienceSince;
    if (args.mreOfficeNumber !== undefined)
      updates.mreOfficeNumber = args.mreOfficeNumber;
    if (args.douNumber !== undefined) updates.douNumber = args.douNumber;
    if (args.douSection !== undefined) updates.douSection = args.douSection;
    if (args.douPage !== undefined) updates.douPage = args.douPage;
    if (args.douDate !== undefined) updates.douDate = args.douDate;
    if (args.protocolNumber !== undefined)
      updates.protocolNumber = args.protocolNumber;
    if (args.rnmNumber !== undefined) updates.rnmNumber = args.rnmNumber;
    if (args.rnmDeadline !== undefined) updates.rnmDeadline = args.rnmDeadline;
    if (args.appointmentDateTime !== undefined)
      updates.appointmentDateTime = args.appointmentDateTime;
    if (args.deadlineDate !== undefined)
      updates.deadlineDate = args.deadlineDate;
    if (args.deadlineUnit !== undefined)
      updates.deadlineUnit = args.deadlineUnit;
    if (args.deadlineQuantity !== undefined)
      updates.deadlineQuantity = args.deadlineQuantity;
    if (args.deadlineSpecificDate !== undefined)
      updates.deadlineSpecificDate = args.deadlineSpecificDate;
    if (args.lastSalaryCurrency !== undefined) updates.lastSalaryCurrency = args.lastSalaryCurrency;
    if (args.lastSalaryAmount !== undefined) updates.lastSalaryAmount = args.lastSalaryAmount;
    if (args.exchangeRateToBRL !== undefined) updates.exchangeRateToBRL = args.exchangeRateToBRL;
    if (args.salaryInBRL !== undefined) updates.salaryInBRL = args.salaryInBRL;
    if (args.monthlyAmountToReceive !== undefined) updates.monthlyAmountToReceive = args.monthlyAmountToReceive;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.urgent !== undefined) updates.urgent = args.urgent;

    // Handle processStatus field with backward compatibility
    if (args.processStatus !== undefined) {
      updates.processStatus = args.processStatus;
      // Keep isActive in sync with processStatus
      updates.isActive = args.processStatus !== "Anterior";
    }

    // Mark as completed if status is completed (backward compatibility)
    if ((args.status === "completed" || (newCaseStatus && newCaseStatus.code === "deferido")) && !process.completedAt) {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(id, updates);

    // Sync dateProcess changes to "em preparação" status
    if (args.dateProcess !== undefined) {
      const emPreparacaoStatus = await getEmPreparacaoStatus(ctx, id);
      if (emPreparacaoStatus && emPreparacaoStatus.date !== args.dateProcess) {
        await ctx.db.patch(emPreparacaoStatus._id, {
          date: args.dateProcess,
        });
      }
    }

    // Log status change to history and create new status record if status was updated
    if (isStatusChanging && newCaseStatus) {
      // Get current user ID for status tracking
      const userId = await getAuthUserId(ctx);
      if (userId === null) {
        throw new Error("Not authenticated");
      }

      // Get old case status name for logging
      let oldCaseStatusName = process.status;
      if (process.caseStatusId) {
        const oldCaseStatus = await ctx.db.get(process.caseStatusId);
        if (oldCaseStatus) {
          oldCaseStatusName = oldCaseStatus.name;
        }
      }

      // Create new status record with case status ID
      try {
        const newStatusId = await ctx.db.insert("individualProcessStatuses", {
          individualProcessId: id,
          caseStatusId: newCaseStatus._id, // NEW: Store case status ID
          statusName: newCaseStatus.name, // Store case status name
          isActive: true,
          notes: `Status changed from ${oldCaseStatusName} to ${newCaseStatus.name}`,
          changedBy: userId,
          changedAt: Date.now(),
          createdAt: Date.now(),
        });

        // Ensure only one status is active
        await ensureSingleActiveStatus(ctx, id, newStatusId);
      } catch (error) {
        console.error("Failed to create new status record:", error);
      }

      await logStatusChange(
        ctx,
        id,
        oldCaseStatusName,
        newCaseStatus.name,
        `Status changed from ${oldCaseStatusName} to ${newCaseStatus.name}`
      );

      // Auto-generate tasks for the new status
      try {
        await autoGenerateTasksOnStatusChange(ctx, id, newCaseStatus.code, userId);
      } catch (error) {
        // Log error but don't fail status update
        console.error("Failed to auto-generate tasks:", error);
      }

      // Send notification about status change
      try {
        // Get person and main process for notification details
        const person = await ctx.db.get(process.personId);
        const collectiveProcess = process.collectiveProcessId
          ? await ctx.db.get(process.collectiveProcessId)
          : null;

        if (person && collectiveProcess) {
          // Notify company contact person (client user)
          const companyUsers = await ctx.db
            .query("userProfiles")
            .withIndex("by_company", (q) => q.eq("companyId", collectiveProcess.companyId))
            .collect();

          const personName = person.fullName;

          // Create notifications for all company users (only those with userId)
          for (const companyUser of companyUsers) {
            if (companyUser.userId) {
              await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
                userId: companyUser.userId,
                type: "status_change",
                title: "Individual Process Status Updated",
                message: `Status changed for ${personName}: ${oldCaseStatusName} → ${newCaseStatus.name}`,
                entityType: "individualProcess",
                entityId: id,
              });
            }
          }
        }
      } catch (error) {
        // Log error but don't fail status update
        console.error("Failed to create status change notification:", error);
      }
    }

    // Log activity with before/after values (non-blocking)
    try {
      const changedFields: Record<string, { before: any; after: any }> = {};
      Object.keys(updates).forEach((key) => {
        if (key !== "updatedAt" && updates[key] !== process[key as keyof typeof process]) {
          changedFields[key] = {
            before: process[key as keyof typeof process],
            after: updates[key],
          };
        }
      });

      if (Object.keys(changedFields).length > 0) {
        const [person, collectiveProcess] = await Promise.all([
          ctx.db.get(process.personId),
          process.collectiveProcessId ? ctx.db.get(process.collectiveProcessId) : Promise.resolve(null),
        ]);

    if (!userProfile.userId) throw new Error("User must be activated");
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: args.status && args.status !== process.status ? "status_changed" : "updated",
          entityType: "individualProcess",
          entityId: id,
          details: {
            personName: person?.fullName,
            collectiveProcessReference: collectiveProcess?.referenceNumber,
            changes: changedFields,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Mutation to delete individual process (admin only)
 */
export const remove = mutation({
  args: { id: v.id("individualProcesses") },
  handler: async (ctx, { id }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Individual process not found");
    }

    // Get person and main process data before deletion
    const [person, collectiveProcess] = await Promise.all([
      ctx.db.get(process.personId),
      process.collectiveProcessId ? ctx.db.get(process.collectiveProcessId) : Promise.resolve(null),
    ]);

    // CASCADE DELETE: Delete all related data
    // 1. Delete related documents delivered
    const documentsDelivered = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", id))
      .collect();

    for (const doc of documentsDelivered) {
      await ctx.db.delete(doc._id);
    }

    // 2. Delete related individual process statuses
    const statuses = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", id))
      .collect();

    for (const status of statuses) {
      await ctx.db.delete(status._id);
    }

    // 3. Delete related process history
    const history = await ctx.db
      .query("processHistory")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", id))
      .collect();

    for (const historyEntry of history) {
      await ctx.db.delete(historyEntry._id);
    }

    // 4. Delete related tasks (optional relationship)
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", id))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    // Finally, delete the individual process itself
    await ctx.db.delete(id);

    // Log activity (non-blocking)
    if (!userProfile.userId) throw new Error("User must be activated");
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "individualProcess",
        entityId: id,
        details: {
          personName: person?.fullName,
          collectiveProcessReference: collectiveProcess?.referenceNumber,
          status: process.status,
          legalFrameworkId: process.legalFrameworkId,
          relatedDataDeleted: {
            documentsDelivered: documentsDelivered.length,
            statuses: statuses.length,
            history: history.length,
            tasks: tasks.length,
          },
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Mutation to manually regenerate document checklist (admin only)
 * Deletes existing not_started documents and regenerates from current template
 * Preserves uploaded/reviewed documents
 */
export const regenerateDocumentChecklist = mutation({
  args: { id: v.id("individualProcesses") },
  handler: async (ctx, { id }) => {
    // Require admin role
    await requireAdmin(ctx);

    const individualProcess = await ctx.db.get(id);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Get all existing documents for this process
    const existingDocuments = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", id),
      )
      .collect();

    // Delete only not_started documents
    for (const doc of existingDocuments) {
      if (doc.status === "not_started") {
        await ctx.db.delete(doc._id);
      }
    }

    // Regenerate checklist from current template
    const createdDocumentIds = await generateDocumentChecklist(ctx, id);

    return {
      deletedCount: existingDocuments.filter((d) => d.status === "not_started")
        .length,
      createdCount: createdDocumentIds.length,
    };
  },
});

/**
 * Query to get individual processes by collective process
 * Access control: Clients can only list individuals for their company's processes
 */
export const listByCollectiveProcess = query({
  args: { collectiveProcessId: v.id("collectiveProcesses") },
  handler: async (ctx, { collectiveProcessId }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Fetch the collective process to check access
    const collectiveProcess = await ctx.db.get(collectiveProcessId);
    if (!collectiveProcess) {
      throw new Error("Collective process not found");
    }

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId || collectiveProcess.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view individual processes for this main process"
        );
      }
    }

    const results = await ctx.db
      .query("individualProcesses")
      .withIndex("by_collectiveProcess", (q) => q.eq("collectiveProcessId", collectiveProcessId))
      .collect();

    // Enrich with person data
    const enrichedResults = await Promise.all(
      results.map(async (process) => {
        const [person, legalFramework, cbo] = await Promise.all([
          ctx.db.get(process.personId),
          process.legalFrameworkId ? ctx.db.get(process.legalFrameworkId) : null,
          process.cboId ? ctx.db.get(process.cboId) : null,
        ]);

        return {
          ...process,
          person,
          legalFramework,
          cbo,
        };
      }),
    );

    return enrichedResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Mutation to update urgent flag for an individual process and all other processes in the same collective group
 * When a process is part of a collective process, all other individual processes in that collective will have the same urgent flag value
 */
export const updateUrgentForCollectiveGroup = mutation({
  args: {
    id: v.id("individualProcesses"),
    urgent: v.boolean(),
  },
  handler: async (ctx, { id, urgent }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Individual process not found");
    }

    const now = Date.now();

    // Update the current process
    await ctx.db.patch(id, {
      urgent,
      updatedAt: now,
    });

    // If this process is part of a collective process, update all other processes in the same collective
    if (process.collectiveProcessId) {
      // Get all individual processes from the same collective process
      const relatedProcesses = await ctx.db
        .query("individualProcesses")
        .withIndex("by_collectiveProcess", (q) =>
          q.eq("collectiveProcessId", process.collectiveProcessId)
        )
        .collect();

      // Update all related processes (excluding the current one)
      const updatePromises = relatedProcesses
        .filter((p) => p._id !== id)
        .map((p) =>
          ctx.db.patch(p._id, {
            urgent,
            updatedAt: now,
          })
        );

      await Promise.all(updatePromises);

      // Log activity for bulk update
      try {
        const collectiveProcess = await ctx.db.get(process.collectiveProcessId);
        if (!userProfile.userId) throw new Error("User must be activated");

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: "bulk_urgent_update",
          entityType: "individualProcess",
          entityId: id,
          details: {
            collectiveProcessReference: collectiveProcess?.referenceNumber,
            urgent,
            affectedProcesses: relatedProcesses.length,
          },
        });
      } catch (error) {
        console.error("Failed to log activity:", error);
      }
    } else {
      // If not part of a collective process, just log the individual update
      try {
        const person = await ctx.db.get(process.personId);
        if (!userProfile.userId) throw new Error("User must be activated");

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: "urgent_update",
          entityType: "individualProcess",
          entityId: id,
          details: {
            personName: person?.fullName,
            urgent,
          },
        });
      } catch (error) {
        console.error("Failed to log activity:", error);
      }
    }

    return id;
  },
});

/**
 * Mutation to update authorization fields (processTypeId, legalFrameworkId, deadline) for all individual processes in a collective group
 * Similar to updateUrgentForCollectiveGroup but for authorization-related fields
 */
export const updateAuthorizationForCollectiveGroup = mutation({
  args: {
    id: v.id("individualProcesses"),
    processTypeId: v.optional(v.id("processTypes")),
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    deadlineUnit: v.optional(v.union(v.literal("years"), v.literal("months"), v.literal("days"))),
    deadlineQuantity: v.optional(v.number()),
  },
  handler: async (ctx, { id, processTypeId, legalFrameworkId, deadlineUnit, deadlineQuantity }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Individual process not found");
    }

    const now = Date.now();

    // Calculate deadline specific date if unit and quantity are provided
    let deadlineSpecificDate: string | undefined = undefined;
    if (deadlineUnit && deadlineQuantity !== undefined && deadlineQuantity > 0) {
      const currentDate = new Date();

      switch (deadlineUnit) {
        case "years":
          currentDate.setFullYear(currentDate.getFullYear() + deadlineQuantity);
          break;
        case "months":
          currentDate.setMonth(currentDate.getMonth() + deadlineQuantity);
          break;
        case "days":
          currentDate.setDate(currentDate.getDate() + deadlineQuantity);
          break;
      }

      // Format as ISO date (YYYY-MM-DD)
      deadlineSpecificDate = currentDate.toISOString().split('T')[0];
    }

    // Prepare update object
    const updateData: {
      processTypeId?: Id<"processTypes">;
      legalFrameworkId?: Id<"legalFrameworks">;
      deadlineUnit?: "years" | "months" | "days";
      deadlineQuantity?: number;
      deadlineSpecificDate?: string;
      updatedAt: number;
    } = {
      updatedAt: now,
    };

    if (processTypeId !== undefined) updateData.processTypeId = processTypeId;
    if (legalFrameworkId !== undefined) updateData.legalFrameworkId = legalFrameworkId;
    if (deadlineUnit !== undefined) updateData.deadlineUnit = deadlineUnit;
    if (deadlineQuantity !== undefined) updateData.deadlineQuantity = deadlineQuantity;
    if (deadlineSpecificDate !== undefined) updateData.deadlineSpecificDate = deadlineSpecificDate;

    // Update the current process
    await ctx.db.patch(id, updateData);

    // If this process is part of a collective process, update all other processes in the same collective
    if (process.collectiveProcessId) {
      // Get all individual processes from the same collective process
      const relatedProcesses = await ctx.db
        .query("individualProcesses")
        .withIndex("by_collectiveProcess", (q) =>
          q.eq("collectiveProcessId", process.collectiveProcessId)
        )
        .collect();

      // Update all related processes (excluding the current one)
      const updatePromises = relatedProcesses
        .filter((p) => p._id !== id)
        .map((p) => ctx.db.patch(p._id, updateData));

      await Promise.all(updatePromises);

      // Log activity for bulk update
      try {
        const collectiveProcess = await ctx.db.get(process.collectiveProcessId);
        if (!userProfile.userId) throw new Error("User must be activated");

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: "bulk_authorization_update",
          entityType: "individualProcess",
          entityId: id,
          details: {
            collectiveProcessReference: collectiveProcess?.referenceNumber,
            processTypeId,
            legalFrameworkId,
            deadlineUnit,
            deadlineQuantity,
            deadlineSpecificDate,
            affectedProcesses: relatedProcesses.length,
          },
        });
      } catch (error) {
        console.error("Failed to log activity:", error);
      }
    } else {
      // If not part of a collective process, just log the individual update
      try {
        const person = await ctx.db.get(process.personId);
        if (!userProfile.userId) throw new Error("User must be activated");

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: "authorization_update",
          entityType: "individualProcess",
          entityId: id,
          details: {
            personName: person?.fullName,
            processTypeId,
            legalFrameworkId,
            deadlineUnit,
            deadlineQuantity,
            deadlineSpecificDate,
          },
        });
      } catch (error) {
        console.error("Failed to log activity:", error);
      }
    }

    return {
      id,
      affectedProcesses: process.collectiveProcessId
        ? (await ctx.db
            .query("individualProcesses")
            .withIndex("by_collectiveProcess", (q) =>
              q.eq("collectiveProcessId", process.collectiveProcessId!)
            )
            .collect()).length
        : 1
    };
  },
});

/**
 * Query to list all individual processes with RNM appointments
 * Returns processes with appointmentDateTime populated, joined with person and company data
 * Access control: Admins see all, clients see only their company's appointments
 */
export const listRNMAppointments = query({
  args: {},
  handler: async (ctx) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Get all individual processes
    const allProcesses = await ctx.db
      .query("individualProcesses")
      .collect();

    // Filter processes with appointmentDateTime
    const processesWithAppointments = allProcesses.filter(
      (process) => process.appointmentDateTime !== undefined && process.appointmentDateTime !== null
    );

    // Apply access control for client users
    let filteredProcesses = processesWithAppointments;
    if (userProfile.role === "client" && userProfile.companyId) {
      // Get all collective processes for the client's company
      const clientCollectiveProcesses = await ctx.db
        .query("collectiveProcesses")
        .withIndex("by_company", (q) => q.eq("companyId", userProfile.companyId!))
        .collect();

      const clientCollectiveProcessIds = new Set(clientCollectiveProcesses.map((cp) => cp._id));

      // Filter to only include processes from client's collective processes
      filteredProcesses = processesWithAppointments.filter((process) =>
        process.collectiveProcessId && clientCollectiveProcessIds.has(process.collectiveProcessId)
      );
    }

    // Enrich with person and company data
    const enrichedResults = await Promise.all(
      filteredProcesses.map(async (process) => {
        const [person, companyApplicant] = await Promise.all([
          ctx.db.get(process.personId),
          process.companyApplicantId ? ctx.db.get(process.companyApplicantId) : null,
        ]);

        return {
          ...process,
          person,
          companyApplicant,
        };
      })
    );

    // Sort by appointment date (earliest first)
    return enrichedResults.sort((a, b) => {
      const dateA = new Date(a.appointmentDateTime!).getTime();
      const dateB = new Date(b.appointmentDateTime!).getTime();
      return dateA - dateB;
    });
  },
});
