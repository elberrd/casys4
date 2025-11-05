import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { internal } from "./_generated/api";
import { normalizeString } from "./lib/stringUtils";
import { calculateMainProcessStatus } from "./lib/statusCalculation";

/**
 * Query to list all main processes with optional filters
 * Access control: Admins see all processes, clients see only their company's processes
 */
export const list = query({
  args: {
    companyId: v.optional(v.id("companies")),
    processTypeId: v.optional(v.id("processTypes")),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
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

    // Enrich with related data first, then apply search filter
    const enrichedBeforeSearch = await Promise.all(
      filteredResults.map(async (process) => {
        const [company, contactPerson, processType, workplaceCity, consulate] =
          await Promise.all([
            process.companyId ? ctx.db.get(process.companyId) : null,
            process.contactPersonId ? ctx.db.get(process.contactPersonId) : null,
            process.processTypeId ? ctx.db.get(process.processTypeId) : null,
            process.workplaceCityId ? ctx.db.get(process.workplaceCityId) : null,
            process.consulateId ? ctx.db.get(process.consulateId) : null,
          ]);

        // Get individual processes with case statuses
        const individualProcessesRaw = await ctx.db
          .query("individualProcesses")
          .withIndex("by_mainProcess", (q) =>
            q.eq("mainProcessId", process._id),
          )
          .collect();

        // Enrich individual processes with case status details
        const individualProcesses = await Promise.all(
          individualProcessesRaw.map(async (ip) => {
            const caseStatus = ip.caseStatusId
              ? await ctx.db.get(ip.caseStatusId)
              : null;
            return {
              ...ip,
              caseStatus,
            };
          })
        );

        // Calculate main process status
        const calculatedStatus = calculateMainProcessStatus(individualProcesses, "pt");

        return {
          ...process,
          company,
          contactPerson,
          processType,
          workplaceCity,
          consulate,
          individualProcessesCount: individualProcesses.length,
          calculatedStatus,
        };
      }),
    );

    // Apply accent-insensitive search filter after enrichment
    let enrichedResults = enrichedBeforeSearch;
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      enrichedResults = enrichedBeforeSearch.filter(
        (process) =>
          normalizeString(process.referenceNumber).includes(searchNormalized) ||
          (process.notes && normalizeString(process.notes).includes(searchNormalized)) ||
          (process.company && normalizeString(process.company.name).includes(searchNormalized)) ||
          (process.contactPerson && normalizeString(process.contactPerson.fullName).includes(searchNormalized))
      );
    }

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
        process.companyId ? ctx.db.get(process.companyId) : null,
        process.contactPersonId ? ctx.db.get(process.contactPersonId) : null,
        process.processTypeId ? ctx.db.get(process.processTypeId) : null,
        process.workplaceCityId ? ctx.db.get(process.workplaceCityId) : null,
        process.consulateId ? ctx.db.get(process.consulateId) : null,
      ]);

    // Get individual processes with their case statuses
    const individualProcessesRaw = await ctx.db
      .query("individualProcesses")
      .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", process._id))
      .collect();

    // Enrich individual processes with case status details
    const individualProcesses = await Promise.all(
      individualProcessesRaw.map(async (ip) => {
        const caseStatus = ip.caseStatusId
          ? await ctx.db.get(ip.caseStatusId)
          : null;
        return {
          ...ip,
          caseStatus,
        };
      })
    );

    // Calculate main process status from individual processes
    const calculatedStatus = calculateMainProcessStatus(individualProcesses, "pt");

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
      calculatedStatus,
    };
  },
});

/**
 * Mutation to create main process (admin only)
 * NOTE: Status is now calculated from individual processes, but kept for backward compatibility
 */
export const create = mutation({
  args: {
    referenceNumber: v.string(),
    companyId: v.id("companies"),
    contactPersonId: v.id("people"),
    processTypeId: v.id("processTypes"),
    workplaceCityId: v.id("cities"),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.optional(v.boolean()),
    requestDate: v.string(),
    notes: v.optional(v.string()),
    // DEPRECATED: Status is calculated, kept for backward compatibility during migration
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
      isUrgent: args.isUrgent ?? false,
      requestDate: args.requestDate,
      notes: args.notes,
      // DEPRECATED: Kept for backward compatibility, status is now calculated
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    });

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId!,
        action: "created",
        entityType: "mainProcess",
        entityId: processId,
        details: {
          referenceNumber: args.referenceNumber,
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
 * NOTE: Status is now calculated from individual processes, but kept for backward compatibility
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
    // DEPRECATED: Status is calculated, kept for backward compatibility during migration
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
    // DEPRECATED: Status kept for backward compatibility
    if (args.status !== undefined) updates.status = args.status;

    // DEPRECATED: completedAt kept for backward compatibility
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
          userId: userProfile.userId!,
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
        userId: userProfile.userId!,
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

// REMOVED: complete(), cancel(), and reopen() mutations
// These mutations are no longer needed because:
// - Main process status is now calculated from individual process statuses
// - Individual processes should be updated directly to change the main process status
// - This provides more accurate and automatic status tracking
