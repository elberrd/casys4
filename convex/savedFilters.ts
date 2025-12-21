import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUserProfile, requireActiveUserProfile } from "./lib/auth";
import { internal } from "./_generated/api";

/**
 * Saved Filters
 *
 * Allows users to save and quickly reapply filter configurations for:
 * - Individual Processes page
 * - Collective Processes page
 */

// ==================== QUERIES ====================

/**
 * List all active saved filters for the current user, filtered by type
 */
export const listByType = query({
  args: {
    filterType: v.union(
      v.literal("individualProcesses"),
      v.literal("collectiveProcesses")
    ),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const userId = userProfile.userId;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const filters = await ctx.db
      .query("savedFilters")
      .withIndex("by_createdBy_type", (q) =>
        q.eq("createdBy", userId).eq("filterType", args.filterType)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();

    return filters;
  },
});

/**
 * Get a single saved filter by ID with ownership verification
 */
export const get = query({
  args: {
    id: v.id("savedFilters"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const userId = userProfile.userId;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const filter = await ctx.db.get(args.id);

    if (!filter) {
      return null;
    }

    // Verify ownership
    if (filter.createdBy !== userId) {
      throw new Error("Access denied: You can only access your own saved filters");
    }

    // Only return active filters
    if (!filter.isActive) {
      return null;
    }

    return filter;
  },
});

// ==================== MUTATIONS ====================

/**
 * Create a new saved filter
 */
export const create = mutation({
  args: {
    name: v.string(),
    filterType: v.union(
      v.literal("individualProcesses"),
      v.literal("collectiveProcesses")
    ),
    filterCriteria: v.any(),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireActiveUserProfile(ctx);

    // Validate name
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Filter name is required");
    }
    if (args.name.length > 100) {
      throw new Error("Filter name must be 100 characters or less");
    }

    // Validate filterCriteria is not empty
    if (!args.filterCriteria || Object.keys(args.filterCriteria).length === 0) {
      throw new Error("Filter criteria cannot be empty");
    }

    const now = Date.now();

    const filterId = await ctx.db.insert("savedFilters", {
      name: args.name.trim(),
      filterType: args.filterType,
      filterCriteria: args.filterCriteria,
      createdBy: userProfile.userId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "savedFilters",
        entityId: filterId,
        details: {
          filterType: args.filterType,
          filterName: args.name,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return filterId;
  },
});

/**
 * Update an existing saved filter
 */
export const update = mutation({
  args: {
    id: v.id("savedFilters"),
    name: v.optional(v.string()),
    filterCriteria: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireActiveUserProfile(ctx);

    const filter = await ctx.db.get(args.id);

    if (!filter) {
      throw new Error("Filter not found");
    }

    // Verify ownership
    if (filter.createdBy !== userProfile.userId) {
      throw new Error("Access denied: You can only update your own saved filters");
    }

    // Validate optional name if provided
    if (args.name !== undefined) {
      if (!args.name || args.name.trim().length === 0) {
        throw new Error("Filter name cannot be empty");
      }
      if (args.name.length > 100) {
        throw new Error("Filter name must be 100 characters or less");
      }
    }

    // Validate optional filterCriteria if provided
    if (args.filterCriteria !== undefined) {
      if (!args.filterCriteria || Object.keys(args.filterCriteria).length === 0) {
        throw new Error("Filter criteria cannot be empty");
      }
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name.trim();
    }

    if (args.filterCriteria !== undefined) {
      updates.filterCriteria = args.filterCriteria;
    }

    await ctx.db.patch(args.id, updates);

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "updated",
        entityType: "savedFilters",
        entityId: args.id,
        details: {
          filterType: filter.filterType,
          filterName: args.name || filter.name,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return args.id;
  },
});

/**
 * Soft delete a saved filter
 */
export const remove = mutation({
  args: {
    id: v.id("savedFilters"),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireActiveUserProfile(ctx);

    const filter = await ctx.db.get(args.id);

    if (!filter) {
      throw new Error("Filter not found");
    }

    // Verify ownership
    if (filter.createdBy !== userProfile.userId) {
      throw new Error("Access denied: You can only delete your own saved filters");
    }

    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "savedFilters",
        entityId: args.id,
        details: {
          filterType: filter.filterType,
          filterName: filter.name,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return args.id;
  },
});
