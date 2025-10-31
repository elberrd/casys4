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
import { ensureSingleActiveStatus } from "./lib/statusManagement";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Query to list all individual processes with optional filters
 * Access control: Admins see all processes, clients see only their company's processes (via mainProcess.companyId)
 */
export const list = query({
  args: {
    mainProcessId: v.optional(v.id("mainProcesses")),
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
    if (args.mainProcessId !== undefined) {
      const mainProcessId = args.mainProcessId;
      results = await ctx.db
        .query("individualProcesses")
        .withIndex("by_mainProcess", (q) =>
          q.eq("mainProcessId", mainProcessId),
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
    if (args.mainProcessId === undefined && args.isActive !== undefined) {
      filteredResults = results.filter((r) => r.isActive === args.isActive);
    }
    if (args.personId === undefined && args.status !== undefined) {
      filteredResults = filteredResults.filter((r) => r.status === args.status);
    }

    // Apply role-based access control via mainProcess.companyId
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Filter by mainProcess.companyId - fetch mainProcesses for each result
      const filteredByCompany = await Promise.all(
        filteredResults.map(async (process) => {
          const mainProcess = await ctx.db.get(process.mainProcessId);
          if (mainProcess && mainProcess.companyId === userProfile.companyId) {
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
        const [person, mainProcess, legalFramework, cbo, activeStatus, caseStatus, passport] = await Promise.all([
          ctx.db.get(process.personId),
          ctx.db.get(process.mainProcessId),
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
        ]);

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

        return {
          ...process,
          person,
          mainProcess,
          legalFramework,
          cbo,
          activeStatus,
          caseStatus, // NEW: Include full case status object with name, nameEn, color, etc.
          passport: enrichedPassport,
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

    const [person, mainProcess, legalFramework, cbo, activeStatus, caseStatus, passport] = await Promise.all([
      ctx.db.get(process.personId),
      ctx.db.get(process.mainProcessId),
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
    ]);

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId || !mainProcess || mainProcess.companyId !== userProfile.companyId) {
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

    return {
      ...process,
      person,
      mainProcess,
      legalFramework,
      cbo,
      activeStatus,
      caseStatus, // NEW: Include full case status object with name, nameEn, color, etc.
      passport: enrichedPassport,
    };
  },
});

/**
 * Mutation to create individual process (admin only)
 * Updated to use caseStatusId instead of status string
 */
export const create = mutation({
  args: {
    mainProcessId: v.id("mainProcesses"),
    personId: v.id("people"),
    passportId: v.optional(v.id("passports")), // Reference to the person's passport
    caseStatusId: v.id("caseStatuses"), // NEW: Use case status ID
    status: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    cboId: v.optional(v.id("cboCodes")),
    mreOfficeNumber: v.optional(v.string()),
    douNumber: v.optional(v.string()),
    douSection: v.optional(v.string()),
    douPage: v.optional(v.string()),
    douDate: v.optional(v.string()),
    protocolNumber: v.optional(v.string()),
    rnmNumber: v.optional(v.string()),
    rnmDeadline: v.optional(v.string()),
    appointmentDateTime: v.optional(v.string()),
    deadlineDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
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

    // Validate that case status exists
    const caseStatus = await ctx.db.get(args.caseStatusId);
    if (!caseStatus) {
      throw new Error("Case status not found");
    }

    // For backward compatibility, derive status string from case status if not provided
    const statusString = args.status || caseStatus.code;

    const processId = await ctx.db.insert("individualProcesses", {
      mainProcessId: args.mainProcessId,
      personId: args.personId,
      passportId: args.passportId, // Store passport reference
      caseStatusId: args.caseStatusId, // NEW: Store case status ID
      status: statusString, // DEPRECATED: Keep for backward compatibility
      legalFrameworkId: args.legalFrameworkId,
      cboId: args.cboId,
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
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial status record in the new status system
    try {
      await ctx.db.insert("individualProcessStatuses", {
        individualProcessId: processId,
        caseStatusId: args.caseStatusId, // NEW: Store case status ID
        statusName: caseStatus.name, // Store case status name
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
      const [person, mainProcess] = await Promise.all([
        ctx.db.get(args.personId),
        ctx.db.get(args.mainProcessId),
      ]);

      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "individualProcess",
        entityId: processId,
        details: {
          personName: person?.fullName,
          mainProcessReference: mainProcess?.referenceNumber,
          caseStatusName: caseStatus.name, // NEW: Log case status name
          caseStatusId: args.caseStatusId, // NEW: Log case status ID
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
 * Mutation to update individual process (admin only)
 * Updated to use caseStatusId instead of status string
 */
export const update = mutation({
  args: {
    id: v.id("individualProcesses"),
    passportId: v.optional(v.id("passports")), // Reference to the person's passport
    caseStatusId: v.optional(v.id("caseStatuses")), // NEW: Use case status ID
    status: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    cboId: v.optional(v.id("cboCodes")),
    mreOfficeNumber: v.optional(v.string()),
    douNumber: v.optional(v.string()),
    douSection: v.optional(v.string()),
    douPage: v.optional(v.string()),
    douDate: v.optional(v.string()),
    protocolNumber: v.optional(v.string()),
    rnmNumber: v.optional(v.string()),
    rnmDeadline: v.optional(v.string()),
    appointmentDateTime: v.optional(v.string()),
    deadlineDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
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
    if (args.legalFrameworkId !== undefined)
      updates.legalFrameworkId = args.legalFrameworkId;
    if (args.cboId !== undefined) updates.cboId = args.cboId;
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
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    // Mark as completed if status is completed (backward compatibility)
    if ((args.status === "completed" || (newCaseStatus && newCaseStatus.code === "deferido")) && !process.completedAt) {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(id, updates);

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
          caseStatusId: args.caseStatusId, // NEW: Store case status ID
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
        const mainProcess = await ctx.db.get(process.mainProcessId);

        if (person && mainProcess) {
          // Notify company contact person (client user)
          const companyUsers = await ctx.db
            .query("userProfiles")
            .withIndex("by_company", (q) => q.eq("companyId", mainProcess.companyId))
            .collect();

          const personName = person.fullName;

          // Create notifications for all company users
          for (const companyUser of companyUsers) {
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
        const [person, mainProcess] = await Promise.all([
          ctx.db.get(process.personId),
          ctx.db.get(process.mainProcessId),
        ]);

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: args.status && args.status !== process.status ? "status_changed" : "updated",
          entityType: "individualProcess",
          entityId: id,
          details: {
            personName: person?.fullName,
            mainProcessReference: mainProcess?.referenceNumber,
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
    const [person, mainProcess] = await Promise.all([
      ctx.db.get(process.personId),
      ctx.db.get(process.mainProcessId),
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
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "individualProcess",
        entityId: id,
        details: {
          personName: person?.fullName,
          mainProcessReference: mainProcess?.referenceNumber,
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
 * Query to get individual processes by main process
 * Access control: Clients can only list individuals for their company's processes
 */
export const listByMainProcess = query({
  args: { mainProcessId: v.id("mainProcesses") },
  handler: async (ctx, { mainProcessId }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Fetch the main process to check access
    const mainProcess = await ctx.db.get(mainProcessId);
    if (!mainProcess) {
      throw new Error("Main process not found");
    }

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId || mainProcess.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view individual processes for this main process"
        );
      }
    }

    const results = await ctx.db
      .query("individualProcesses")
      .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", mainProcessId))
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
