import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Query to list all statuses for an individual process
 * Access control: Admins see all, clients see only their company's processes
 */
export const list = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Get the individual process to check access
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Check if the individual process belongs to the client's company
      const mainProcess = await ctx.db.get(individualProcess.mainProcessId);
      if (!mainProcess || mainProcess.companyId !== userProfile.companyId) {
        throw new Error("Access denied: Process does not belong to your company");
      }
    }

    // Query all statuses for this individual process
    const statuses = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", args.individualProcessId)
      )
      .collect();

    // Enrich with user information
    const enrichedStatuses = await Promise.all(
      statuses.map(async (status) => {
        const changedByUser = await ctx.db.get(status.changedBy);
        const changedByProfile = changedByUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", changedByUser._id))
              .first()
          : null;

        return {
          ...status,
          changedByUser: changedByProfile
            ? {
                fullName: changedByProfile.fullName,
                email: changedByProfile.email,
              }
            : null,
        };
      })
    );

    return enrichedStatuses;
  },
});

/**
 * Query to get the currently active status for an individual process
 */
export const getActiveStatus = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Get the individual process to check access
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      const mainProcess = await ctx.db.get(individualProcess.mainProcessId);
      if (!mainProcess || mainProcess.companyId !== userProfile.companyId) {
        throw new Error("Access denied: Process does not belong to your company");
      }
    }

    // Query for the active status
    const activeStatus = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess_active", (q) =>
        q.eq("individualProcessId", args.individualProcessId).eq("isActive", true)
      )
      .first();

    if (!activeStatus) {
      return null;
    }

    // Enrich with user information
    const changedByUser = await ctx.db.get(activeStatus.changedBy);
    const changedByProfile = changedByUser
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", changedByUser._id))
          .first()
      : null;

    return {
      ...activeStatus,
      changedByUser: changedByProfile
        ? {
            fullName: changedByProfile.fullName,
            email: changedByProfile.email,
          }
        : null,
    };
  },
});

/**
 * Query to get status history for an individual process (ordered oldest to newest)
 */
export const getStatusHistory = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Get the individual process to check access
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      const mainProcess = await ctx.db.get(individualProcess.mainProcessId);
      if (!mainProcess || mainProcess.companyId !== userProfile.companyId) {
        throw new Error("Access denied: Process does not belong to your company");
      }
    }

    // Query all statuses and sort by changedAt (oldest to newest)
    const statuses = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", args.individualProcessId)
      )
      .collect();

    // Sort by changedAt in ascending order (oldest first)
    const sortedStatuses = statuses.sort((a, b) => a.changedAt - b.changedAt);

    // Enrich with user information and case status details
    const enrichedStatuses = await Promise.all(
      sortedStatuses.map(async (status) => {
        const [changedByUser, caseStatus] = await Promise.all([
          ctx.db.get(status.changedBy),
          status.caseStatusId ? ctx.db.get(status.caseStatusId) : null,
        ]);

        const changedByProfile = changedByUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", changedByUser._id))
              .first()
          : null;

        return {
          ...status,
          changedByUser: changedByProfile
            ? {
                fullName: changedByProfile.fullName,
                email: changedByProfile.email,
              }
            : null,
          caseStatus, // NEW: Include full case status object with name, nameEn, color, etc.
        };
      })
    );

    return enrichedStatuses;
  },
});

/**
 * Mutation to add a new status to an individual process
 * Admin only - deactivates previous active status
 */
export const addStatus = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    statusName: v.string(),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin access
    await requireAdmin(ctx);

    // Get current user ID
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Verify the individual process exists
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    const now = Date.now();
    const isActive = args.isActive ?? true;

    // If this new status is active, deactivate all other statuses
    if (isActive) {
      const existingStatuses = await ctx.db
        .query("individualProcessStatuses")
        .withIndex("by_individualProcess_active", (q) =>
          q.eq("individualProcessId", args.individualProcessId).eq("isActive", true)
        )
        .collect();

      // Deactivate all existing active statuses
      for (const status of existingStatuses) {
        await ctx.db.patch(status._id, { isActive: false });
      }
    }

    // Create the new status record
    const statusId = await ctx.db.insert("individualProcessStatuses", {
      individualProcessId: args.individualProcessId,
      statusName: args.statusName,
      isActive,
      notes: args.notes,
      changedBy: userId,
      changedAt: now,
      createdAt: now,
    });

    // Update the backward compatibility field in individualProcesses
    if (isActive) {
      await ctx.db.patch(args.individualProcessId, {
        status: args.statusName,
        updatedAt: now,
      });
    }

    // Log activity
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId,
      action: "status_added",
      entityType: "individualProcessStatus",
      entityId: statusId,
      details: {
        individualProcessId: args.individualProcessId,
        statusName: args.statusName,
        isActive,
      },
    });

    return statusId;
  },
});

/**
 * Mutation to update an existing status record
 * Admin only
 */
export const updateStatus = mutation({
  args: {
    statusId: v.id("individualProcessStatuses"),
    statusName: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin access
    await requireAdmin(ctx);

    // Get current user ID
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Get the status record
    const status = await ctx.db.get(args.statusId);
    if (!status) {
      throw new Error("Status record not found");
    }

    const now = Date.now();

    // If changing to active, deactivate other statuses
    if (args.isActive === true && !status.isActive) {
      const existingStatuses = await ctx.db
        .query("individualProcessStatuses")
        .withIndex("by_individualProcess_active", (q) =>
          q.eq("individualProcessId", status.individualProcessId).eq("isActive", true)
        )
        .collect();

      for (const existingStatus of existingStatuses) {
        await ctx.db.patch(existingStatus._id, { isActive: false });
      }
    }

    // Update the status record
    const updates: {
      statusName?: string;
      notes?: string;
      isActive?: boolean;
    } = {};
    if (args.statusName !== undefined) updates.statusName = args.statusName;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.statusId, updates);

    // Update backward compatibility field if this is now the active status
    if (args.isActive === true || (status.isActive && args.statusName !== undefined)) {
      await ctx.db.patch(status.individualProcessId, {
        status: args.statusName ?? status.statusName,
        updatedAt: now,
      });
    }

    // Log activity
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId,
      action: "status_updated",
      entityType: "individualProcessStatus",
      entityId: args.statusId,
      details: {
        individualProcessId: status.individualProcessId,
        updates,
      },
    });

    return args.statusId;
  },
});

/**
 * Mutation to delete a status record
 * Admin only - cannot delete the active status
 */
export const deleteStatus = mutation({
  args: {
    statusId: v.id("individualProcessStatuses"),
  },
  handler: async (ctx, args) => {
    // Require admin access
    await requireAdmin(ctx);

    // Get current user ID
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Get the status record
    const status = await ctx.db.get(args.statusId);
    if (!status) {
      throw new Error("Status record not found");
    }

    // Cannot delete the active status
    if (status.isActive) {
      throw new Error("Cannot delete the active status. Please deactivate it first or set another status as active.");
    }

    // Delete the status record
    await ctx.db.delete(args.statusId);

    // Log activity
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId,
      action: "status_deleted",
      entityType: "individualProcessStatus",
      entityId: args.statusId,
      details: {
        individualProcessId: status.individualProcessId,
        statusName: status.statusName,
      },
    });

    return { success: true };
  },
});
