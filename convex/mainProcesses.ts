import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { internal } from "./_generated/api";

/**
 * Query to list all main processes with optional filters
 * Access control: Admins see all processes, clients see only their company's processes
 */
export const list = query({
  args: {
    companyId: v.optional(v.id("companies")),
    processTypeId: v.optional(v.id("processTypes")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    let results;

    // For client users, override companyId filter to their own company
    let effectiveCompanyId = args.companyId;
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }
      effectiveCompanyId = userProfile.companyId;
    }

    // Apply filters
    if (effectiveCompanyId !== undefined) {
      const companyId = effectiveCompanyId;
      results = await ctx.db
        .query("mainProcesses")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect();
    } else if (args.processTypeId !== undefined) {
      const processTypeId = args.processTypeId;
      results = await ctx.db
        .query("mainProcesses")
        .withIndex("by_processType", (q) =>
          q.eq("processTypeId", processTypeId),
        )
        .collect();
    } else if (args.status !== undefined) {
      const status = args.status;
      results = await ctx.db
        .query("mainProcesses")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      results = await ctx.db.query("mainProcesses").collect();
    }

    // For client users, ensure all results are filtered by their company
    if (userProfile.role === "client" && effectiveCompanyId) {
      results = results.filter((r) => r.companyId === effectiveCompanyId);
    }

    // Filter by additional criteria if needed
    let filteredResults = results;
    if (args.companyId === undefined && args.status !== undefined) {
      filteredResults = results.filter((r) => r.status === args.status);
    }
    if (args.processTypeId === undefined && args.status !== undefined) {
      filteredResults = filteredResults.filter((r) => r.status === args.status);
    }

    // Enrich with related data
    const enrichedResults = await Promise.all(
      filteredResults.map(async (process) => {
        const [company, contactPerson, processType, workplaceCity, consulate] =
          await Promise.all([
            ctx.db.get(process.companyId),
            ctx.db.get(process.contactPersonId),
            ctx.db.get(process.processTypeId),
            ctx.db.get(process.workplaceCityId),
            process.consulateId ? ctx.db.get(process.consulateId) : null,
          ]);

        // Count individual processes
        const individualProcesses = await ctx.db
          .query("individualProcesses")
          .withIndex("by_mainProcess", (q) =>
            q.eq("mainProcessId", process._id),
          )
          .collect();

        return {
          ...process,
          company,
          contactPerson,
          processType,
          workplaceCity,
          consulate,
          individualProcessesCount: individualProcesses.length,
        };
      }),
    );

    return enrichedResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Query to get main process by ID with related data
 * Access control: Admins can view any process, clients can only view their company's processes
 */
export const get = query({
  args: { id: v.id("mainProcesses") },
  handler: async (ctx, { id }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const process = await ctx.db.get(id);
    if (!process) return null;

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId || process.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view this process"
        );
      }
    }

    const [company, contactPerson, processType, workplaceCity, consulate] =
      await Promise.all([
        ctx.db.get(process.companyId),
        ctx.db.get(process.contactPersonId),
        ctx.db.get(process.processTypeId),
        ctx.db.get(process.workplaceCityId),
        process.consulateId ? ctx.db.get(process.consulateId) : null,
      ]);

    // Get individual processes
    const individualProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", process._id))
      .collect();

    // Check if this main process was created from a process request
    let originRequest = null;
    const request = await ctx.db
      .query("processRequests")
      .withIndex("by_approvedMainProcess", (q) =>
        q.eq("approvedMainProcessId", process._id),
      )
      .first();

    if (request) {
      // Get reviewer profile
      let reviewerProfile = null;
      if (request.reviewedBy) {
        const reviewer = await ctx.db.get(request.reviewedBy);
        if (reviewer) {
          reviewerProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", reviewer._id))
            .first();
        }
      }

      originRequest = {
        _id: request._id,
        status: request.status,
        requestDate: request.requestDate,
        isUrgent: request.isUrgent,
        reviewedBy: request.reviewedBy,
        reviewedAt: request.reviewedAt,
        reviewerProfile,
        createdAt: request.createdAt,
      };
    }

    return {
      ...process,
      company,
      contactPerson,
      processType,
      workplaceCity,
      consulate,
      individualProcesses,
      originRequest,
    };
  },
});

/**
 * Mutation to create main process (admin only)
 */
export const create = mutation({
  args: {
    referenceNumber: v.string(),
    companyId: v.id("companies"),
    contactPersonId: v.id("people"),
    processTypeId: v.id("processTypes"),
    workplaceCityId: v.id("cities"),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.boolean(),
    requestDate: v.string(),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const now = Date.now();

    // Check if reference number already exists
    const existing = await ctx.db
      .query("mainProcesses")
      .withIndex("by_referenceNumber", (q) =>
        q.eq("referenceNumber", args.referenceNumber),
      )
      .first();

    if (existing) {
      throw new Error(
        `Main process with reference number ${args.referenceNumber} already exists`,
      );
    }

    const processId = await ctx.db.insert("mainProcesses", {
      referenceNumber: args.referenceNumber,
      companyId: args.companyId,
      contactPersonId: args.contactPersonId,
      processTypeId: args.processTypeId,
      workplaceCityId: args.workplaceCityId,
      consulateId: args.consulateId,
      isUrgent: args.isUrgent,
      requestDate: args.requestDate,
      notes: args.notes,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    });

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "mainProcess",
        entityId: processId,
        details: {
          referenceNumber: args.referenceNumber,
          status: args.status ?? "draft",
          companyId: args.companyId,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return processId;
  },
});

/**
 * Mutation to update main process (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("mainProcesses"),
    referenceNumber: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    contactPersonId: v.optional(v.id("people")),
    processTypeId: v.optional(v.id("processTypes")),
    workplaceCityId: v.optional(v.id("cities")),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.optional(v.boolean()),
    requestDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Main process not found");
    }

    // Check if another process with this reference number exists
    if (args.referenceNumber !== undefined) {
      const referenceNumber = args.referenceNumber;
      const existing = await ctx.db
        .query("mainProcesses")
        .withIndex("by_referenceNumber", (q) =>
          q.eq("referenceNumber", referenceNumber),
        )
        .first();

      if (existing && existing._id !== id) {
        throw new Error(
          `Main process with reference number ${args.referenceNumber} already exists`,
        );
      }
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Only update provided fields
    if (args.referenceNumber !== undefined)
      updates.referenceNumber = args.referenceNumber;
    if (args.companyId !== undefined) updates.companyId = args.companyId;
    if (args.contactPersonId !== undefined)
      updates.contactPersonId = args.contactPersonId;
    if (args.processTypeId !== undefined)
      updates.processTypeId = args.processTypeId;
    if (args.workplaceCityId !== undefined)
      updates.workplaceCityId = args.workplaceCityId;
    if (args.consulateId !== undefined) updates.consulateId = args.consulateId;
    if (args.isUrgent !== undefined) updates.isUrgent = args.isUrgent;
    if (args.requestDate !== undefined) updates.requestDate = args.requestDate;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.status !== undefined) updates.status = args.status;

    // Mark as completed if status is completed
    if (args.status === "completed" && !process.completedAt) {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(id, updates);

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
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: args.status && args.status !== process.status ? "status_changed" : "updated",
          entityType: "mainProcess",
          entityId: id,
          details: {
            referenceNumber: process.referenceNumber,
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
 * Mutation to delete main process (admin only)
 */
export const remove = mutation({
  args: { id: v.id("mainProcesses") },
  handler: async (ctx, { id }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Main process not found");
    }

    // Check if there are individual processes
    const individualProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", id))
      .collect();

    if (individualProcesses.length > 0) {
      throw new Error(
        "Cannot delete main process with associated individual processes",
      );
    }

    // Check if this process was created from an approved request
    const originRequest = await ctx.db
      .query("processRequests")
      .withIndex("by_approvedMainProcess", (q) =>
        q.eq("approvedMainProcessId", id),
      )
      .first();

    if (originRequest) {
      throw new Error(
        "Cannot delete main process created from an approved request. Please reject or unlink the request first.",
      );
    }

    await ctx.db.delete(id);

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "mainProcess",
        entityId: id,
        details: {
          referenceNumber: process.referenceNumber,
          status: process.status,
          companyId: process.companyId,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Query to get main process by reference number
 * Access control: Admins can search any process, clients can only find their company's processes
 */
export const getByReferenceNumber = query({
  args: { referenceNumber: v.string() },
  handler: async (ctx, { referenceNumber }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const process = await ctx.db
      .query("mainProcesses")
      .withIndex("by_referenceNumber", (q) =>
        q.eq("referenceNumber", referenceNumber),
      )
      .first();

    if (!process) return null;

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId || process.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view this process"
        );
      }
    }

    return process;
  },
});

/**
 * Mutation to complete a main process (admin only)
 * Validates that all individual processes are in completed or cancelled status
 */
export const complete = mutation({
  args: {
    id: v.id("mainProcesses"),
  },
  handler: async (ctx, { id }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Main process not found");
    }

    // Check if already completed
    if (process.status === "completed") {
      throw new Error("Main process is already completed");
    }

    // Get all individual processes
    const individualProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", id))
      .collect();

    // Validate that all individuals are completed or cancelled
    const incompleteProcesses = individualProcesses.filter(
      (ip) => ip.status !== "completed" && ip.status !== "cancelled"
    );

    if (incompleteProcesses.length > 0) {
      throw new Error(
        `Cannot complete main process: ${incompleteProcesses.length} individual process(es) are not yet completed or cancelled`
      );
    }

    // Update main process to completed
    await ctx.db.patch(id, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Send notification to company users
    try {
      // Get company users to notify
      const companyUsers = await ctx.db
        .query("userProfiles")
        .withIndex("by_company", (q) => q.eq("companyId", process.companyId))
        .collect();

      // Create notifications for all company users
      for (const companyUser of companyUsers) {
        await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
          userId: companyUser.userId,
          type: "process_milestone",
          title: "Process Completed",
          message: `Main process ${process.referenceNumber} has been completed`,
          entityType: "mainProcess",
          entityId: id,
        });
      }
    } catch (error) {
      console.error("Failed to create process completion notification:", error);
    }

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "completed",
        entityType: "mainProcess",
        entityId: id,
        details: {
          referenceNumber: process.referenceNumber,
          previousStatus: process.status,
          newStatus: "completed",
          individualProcessesCount: individualProcesses.length,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Mutation to cancel a main process (admin only)
 * Optionally cascades cancellation to all individual processes
 */
export const cancel = mutation({
  args: {
    id: v.id("mainProcesses"),
    notes: v.string(),
    cancelIndividuals: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, notes, cancelIndividuals }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Main process not found");
    }

    // Check if already cancelled
    if (process.status === "cancelled") {
      throw new Error("Main process is already cancelled");
    }

    // If cascading cancellation to individuals
    let cancelledCount = 0;
    if (cancelIndividuals) {
      const individualProcesses = await ctx.db
        .query("individualProcesses")
        .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", id))
        .collect();

      // Cancel all non-completed individual processes
      for (const ip of individualProcesses) {
        if (ip.status !== "completed" && ip.status !== "cancelled") {
          await ctx.db.patch(ip._id, {
            status: "cancelled",
            updatedAt: Date.now(),
          });
          cancelledCount++;

          // Log status change (import logStatusChange if available)
          // await logStatusChange(ctx, ip._id, ip.status, "cancelled", notes);
        }
      }
    }

    // Update main process to cancelled
    await ctx.db.patch(id, {
      status: "cancelled",
      notes: notes,
      updatedAt: Date.now(),
    });

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "cancelled",
        entityType: "mainProcess",
        entityId: id,
        details: {
          referenceNumber: process.referenceNumber,
          previousStatus: process.status,
          newStatus: "cancelled",
          notes,
          cascadedCancellation: cancelIndividuals ?? false,
          cancelledIndividualProcesses: cancelledCount,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Mutation to reopen a completed or cancelled main process (admin only)
 */
export const reopen = mutation({
  args: {
    id: v.id("mainProcesses"),
  },
  handler: async (ctx, { id }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Main process not found");
    }

    // Can only reopen completed or cancelled processes
    if (process.status !== "completed" && process.status !== "cancelled") {
      throw new Error(
        `Cannot reopen main process: current status is "${process.status}". Only completed or cancelled processes can be reopened.`
      );
    }

    // Update main process to in_progress
    const updates: any = {
      status: "in_progress",
      updatedAt: Date.now(),
    };

    // Clear completedAt if it was completed
    if (process.completedAt) {
      updates.completedAt = undefined;
    }

    await ctx.db.patch(id, updates);

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "reopened",
        entityType: "mainProcess",
        entityId: id,
        details: {
          referenceNumber: process.referenceNumber,
          previousStatus: process.status,
          newStatus: "in_progress",
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});
