import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin, requireClient } from "./lib/auth";

/**
 * Query to list all process requests with optional filters
 * Access control: Admins see all requests, clients see only their company's requests
 */
export const list = query({
  args: {
    companyId: v.optional(v.id("companies")),
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
        .query("processRequests")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect();
    } else if (args.status !== undefined) {
      const status = args.status;
      results = await ctx.db
        .query("processRequests")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      results = await ctx.db.query("processRequests").collect();
    }

    // For client users, ensure all results are filtered by their company
    if (userProfile.role === "client" && effectiveCompanyId) {
      results = results.filter((r) => r.companyId === effectiveCompanyId);
    }

    // Additional filtering
    if (args.status !== undefined) {
      results = results.filter((r) => r.status === args.status);
    }

    // Enrich with related data
    const enrichedResults = await Promise.all(
      results.map(async (request) => {
        const [company, contactPerson, processType, workplaceCity, consulateRaw, reviewer] =
          await Promise.all([
            ctx.db.get(request.companyId),
            ctx.db.get(request.contactPersonId),
            ctx.db.get(request.processTypeId),
            ctx.db.get(request.workplaceCityId),
            request.consulateId ? ctx.db.get(request.consulateId) : null,
            request.reviewedBy ? ctx.db.get(request.reviewedBy) : null,
          ]);

        // Enrich consulate with city data
        let consulate = null;
        if (consulateRaw) {
          const consulateCity = consulateRaw.cityId ? await ctx.db.get(consulateRaw.cityId) : null;
          consulate = {
            ...consulateRaw,
            city: consulateCity,
          };
        }

        // Get reviewer profile if exists
        let reviewerProfile = null;
        if (reviewer) {
          reviewerProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", reviewer._id))
            .first();
        }

        // Get approved main process if exists
        let approvedMainProcess = null;
        if (request.approvedMainProcessId) {
          approvedMainProcess = await ctx.db.get(request.approvedMainProcessId);
        }

        return {
          ...request,
          company,
          contactPerson,
          processType,
          workplaceCity,
          consulate,
          reviewerProfile,
          approvedMainProcess,
        };
      }),
    );

    return enrichedResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Query to get a single process request by ID
 * Access control: Admins can view any request, clients can only view their company's requests
 */
export const get = query({
  args: { id: v.id("processRequests") },
  handler: async (ctx, { id }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const request = await ctx.db.get(id);
    if (!request) return null;

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId || request.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view this request"
        );
      }
    }

    const [company, contactPerson, processType, workplaceCity, consulateRaw, reviewer] =
      await Promise.all([
        ctx.db.get(request.companyId),
        ctx.db.get(request.contactPersonId),
        ctx.db.get(request.processTypeId),
        ctx.db.get(request.workplaceCityId),
        request.consulateId ? ctx.db.get(request.consulateId) : null,
        request.reviewedBy ? ctx.db.get(request.reviewedBy) : null,
      ]);

    // Enrich consulate with city data
    let consulate = null;
    if (consulateRaw) {
      const consulateCity = consulateRaw.cityId ? await ctx.db.get(consulateRaw.cityId) : null;
      consulate = {
        ...consulateRaw,
        city: consulateCity,
      };
    }

    // Get reviewer profile if exists
    let reviewerProfile = null;
    if (reviewer) {
      reviewerProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", reviewer._id))
        .first();
    }

    // Get approved main process if exists
    let approvedMainProcess = null;
    if (request.approvedMainProcessId) {
      approvedMainProcess = await ctx.db.get(request.approvedMainProcessId);
    }

    return {
      ...request,
      company,
      contactPerson,
      processType,
      workplaceCity,
      consulate,
      reviewerProfile,
      approvedMainProcess,
    };
  },
});

/**
 * Mutation to create a new process request (client users only)
 */
export const create = mutation({
  args: {
    contactPersonId: v.id("people"),
    processTypeId: v.id("processTypes"),
    workplaceCityId: v.id("cities"),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.boolean(),
    requestDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require client role
    const { profile, companyId } = await requireClient(ctx);

    const now = Date.now();

    const requestId = await ctx.db.insert("processRequests", {
      companyId,
      contactPersonId: args.contactPersonId,
      processTypeId: args.processTypeId,
      workplaceCityId: args.workplaceCityId,
      consulateId: args.consulateId,
      isUrgent: args.isUrgent,
      requestDate: args.requestDate,
      notes: args.notes,
      status: "pending",
      createdBy: profile.userId!,
      createdAt: now,
      updatedAt: now,
    });

    return requestId;
  },
});

/**
 * Mutation to approve a process request and create main process (admin only)
 */
export const approve = mutation({
  args: {
    id: v.id("processRequests"),
  },
  handler: async (ctx, { id }) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

    const request = await ctx.db.get(id);
    if (!request) {
      throw new Error("Process request not found");
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot approve request with status: ${request.status}`);
    }

    const now = Date.now();

    // Generate unique reference number for main process
    const year = new Date().getFullYear();
    const allProcesses = await ctx.db.query("mainProcesses").collect();
    const sequenceNumber = allProcesses.length + 1;
    const referenceNumber = `PR-${year}-${sequenceNumber.toString().padStart(4, "0")}`;

    // Create main process from request
    const mainProcessId = await ctx.db.insert("mainProcesses", {
      referenceNumber,
      companyId: request.companyId,
      contactPersonId: request.contactPersonId,
      processTypeId: request.processTypeId,
      workplaceCityId: request.workplaceCityId,
      consulateId: request.consulateId,
      isUrgent: request.isUrgent,
      requestDate: request.requestDate,
      notes: request.notes,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    // Update request to approved status
    await ctx.db.patch(id, {
      status: "approved",
      reviewedBy: adminProfile.userId,
      reviewedAt: now,
      approvedMainProcessId: mainProcessId,
      updatedAt: now,
    });

    return mainProcessId;
  },
});

/**
 * Mutation to reject a process request (admin only)
 */
export const reject = mutation({
  args: {
    id: v.id("processRequests"),
    rejectionReason: v.string(),
  },
  handler: async (ctx, { id, rejectionReason }) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

    const request = await ctx.db.get(id);
    if (!request) {
      throw new Error("Process request not found");
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot reject request with status: ${request.status}`);
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error("Rejection reason is required");
    }

    const now = Date.now();

    await ctx.db.patch(id, {
      status: "rejected",
      reviewedBy: adminProfile.userId,
      reviewedAt: now,
      rejectionReason,
      updatedAt: now,
    });

    return id;
  },
});

/**
 * Mutation to update a process request (admin only, pending requests only)
 */
export const update = mutation({
  args: {
    id: v.id("processRequests"),
    contactPersonId: v.optional(v.id("people")),
    processTypeId: v.optional(v.id("processTypes")),
    workplaceCityId: v.optional(v.id("cities")),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.optional(v.boolean()),
    requestDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    await requireAdmin(ctx);

    const request = await ctx.db.get(id);
    if (!request) {
      throw new Error("Process request not found");
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot update request with status: ${request.status}`);
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Only update provided fields
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

    await ctx.db.patch(id, updates);

    return id;
  },
});

/**
 * Mutation to delete a process request (admin only, cannot delete approved requests)
 */
export const remove = mutation({
  args: { id: v.id("processRequests") },
  handler: async (ctx, { id }) => {
    // Require admin role
    await requireAdmin(ctx);

    const request = await ctx.db.get(id);
    if (!request) {
      throw new Error("Process request not found");
    }

    if (request.status === "approved" && request.approvedMainProcessId) {
      throw new Error(
        "Cannot delete approved request that created a main process. Delete the main process first or use admin override."
      );
    }

    await ctx.db.delete(id);
    return id;
  },
});
