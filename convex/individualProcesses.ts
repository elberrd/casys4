import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { generateDocumentChecklist } from "./lib/documentChecklist";
import { logStatusChange } from "./lib/processHistory";
import { isValidIndividualStatusTransition } from "./lib/statusValidation";
import { autoGenerateTasksOnStatusChange } from "./tasks";
import { internal } from "./_generated/api";

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

    // Enrich with related data
    const enrichedResults = await Promise.all(
      filteredResults.map(async (process) => {
        const [person, mainProcess, legalFramework, cbo] = await Promise.all([
          ctx.db.get(process.personId),
          ctx.db.get(process.mainProcessId),
          ctx.db.get(process.legalFrameworkId),
          process.cboId ? ctx.db.get(process.cboId) : null,
        ]);

        return {
          ...process,
          person,
          mainProcess,
          legalFramework,
          cbo,
        };
      }),
    );

    return enrichedResults.sort((a, b) => b.createdAt - a.createdAt);
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

    const [person, mainProcess, legalFramework, cbo] = await Promise.all([
      ctx.db.get(process.personId),
      ctx.db.get(process.mainProcessId),
      ctx.db.get(process.legalFrameworkId),
      process.cboId ? await ctx.db.get(process.cboId) : null,
    ]);

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId || !mainProcess || mainProcess.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view this individual process"
        );
      }
    }

    return {
      ...process,
      person,
      mainProcess,
      legalFramework,
      cbo,
    };
  },
});

/**
 * Mutation to create individual process (admin only)
 */
export const create = mutation({
  args: {
    mainProcessId: v.id("mainProcesses"),
    personId: v.id("people"),
    status: v.string(),
    legalFrameworkId: v.id("legalFrameworks"),
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

    const processId = await ctx.db.insert("individualProcesses", {
      mainProcessId: args.mainProcessId,
      personId: args.personId,
      status: args.status,
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

    // Log initial status to history
    try {
      await logStatusChange(
        ctx,
        processId,
        undefined,
        args.status,
        `Individual process created with status: ${args.status}`
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
          status: args.status,
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
 */
export const update = mutation({
  args: {
    id: v.id("individualProcesses"),
    status: v.optional(v.string()),
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

    // Validate status transition if status is being updated
    if (args.status !== undefined && args.status !== process.status) {
      const isValid = isValidIndividualStatusTransition(
        process.status,
        args.status
      );

      if (!isValid) {
        throw new Error(
          `Invalid status transition from "${process.status}" to "${args.status}". This transition is not allowed.`
        );
      }
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Only update provided fields
    if (args.status !== undefined) updates.status = args.status;
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

    // Mark as completed if status is completed
    if (args.status === "completed" && !process.completedAt) {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(id, updates);

    // Log status change to history if status was updated
    if (args.status !== undefined && args.status !== process.status) {
      await logStatusChange(
        ctx,
        id,
        process.status,
        args.status,
        `Status changed from ${process.status} to ${args.status}`
      );

      // Auto-generate tasks for the new status
      try {
        const identity = await ctx.auth.getUserIdentity();
        if (identity) {
          const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("email"), identity.email))
            .first();

          if (user) {
            await autoGenerateTasksOnStatusChange(ctx, id, args.status, user._id);
          }
        }
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
              message: `Status changed for ${personName}: ${process.status} → ${args.status}`,
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
          ctx.db.get(process.legalFrameworkId),
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
