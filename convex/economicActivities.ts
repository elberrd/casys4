import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin, getCurrentUserProfile } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";
import { internal } from "./_generated/api";

/**
 * Query to list all economic activities with optional filters
 * Supports accent-insensitive search across name, code, and description
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let activities = await ctx.db.query("economicActivities").collect();

    // Filter by active status if specified
    if (args.isActive !== undefined) {
      activities = activities.filter((activity) => activity.isActive === args.isActive);
    }

    // Filter by search query if provided (accent-insensitive)
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      activities = activities.filter(
        (activity) =>
          normalizeString(activity.name).includes(searchNormalized) ||
          (activity.code && normalizeString(activity.code).includes(searchNormalized)) ||
          (activity.description && normalizeString(activity.description).includes(searchNormalized))
      );
    }

    return activities;
  },
});

/**
 * Query to list only active economic activities
 * Used for dropdown selections in forms
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const activities = await ctx.db
      .query("economicActivities")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return activities;
  },
});

/**
 * Query to get single economic activity by ID
 * Includes usage count (number of companies using this activity)
 */
export const get = query({
  args: { id: v.id("economicActivities") },
  handler: async (ctx, { id }) => {
    const activity = await ctx.db.get(id);
    if (!activity) return null;

    // Count how many companies are using this activity
    const companiesUsingActivity = await ctx.db
      .query("companiesEconomicActivities")
      .withIndex("by_economicActivity", (q) => q.eq("economicActivityId", id))
      .collect();

    return {
      ...activity,
      usageCount: companiesUsingActivity.length,
    };
  },
});

/**
 * Mutation to create an economic activity
 * Allows any authenticated user to create (for quick-create from forms)
 */
export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Allow any authenticated user to create economic activities
    await getCurrentUserProfile(ctx);

    // Validate name is not empty
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Name is required");
    }

    // Check for duplicate names (case-insensitive)
    const existingActivities = await ctx.db.query("economicActivities").collect();
    const normalizedName = normalizeString(args.name);
    const duplicate = existingActivities.find(
      (activity) => normalizeString(activity.name) === normalizedName
    );

    if (duplicate) {
      throw new Error("An economic activity with this name already exists");
    }

    const now = Date.now();
    const activityId = await ctx.db.insert("economicActivities", {
      name: args.name.trim(),
      code: args.code?.trim() || undefined,
      description: args.description?.trim() || undefined,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return activityId;
  },
});

/**
 * Mutation to update an economic activity (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("economicActivities"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    const userProfile = await requireAdmin(ctx);

    // Validate name is not empty
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Name is required");
    }

    // Check if economic activity exists
    const existingActivity = await ctx.db.get(id);
    if (!existingActivity) {
      throw new Error("Economic activity not found");
    }

    // Check for duplicate names (case-insensitive, excluding current activity)
    const allActivities = await ctx.db.query("economicActivities").collect();
    const normalizedName = normalizeString(args.name);
    const duplicate = allActivities.find(
      (activity) => activity._id !== id && normalizeString(activity.name) === normalizedName
    );

    if (duplicate) {
      throw new Error("An economic activity with this name already exists");
    }

    const now = Date.now();
    await ctx.db.patch(id, {
      name: args.name.trim(),
      code: args.code?.trim() || undefined,
      description: args.description?.trim() || undefined,
      isActive: args.isActive ?? existingActivity.isActive,
      updatedAt: now,
    });

    // Log activity for audit trail
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId: userProfile.userId as Id<"users">,
      action: "updated",
      entityType: "economicActivity",
      entityId: id,
      details: {
        previousName: existingActivity.name,
        newName: args.name,
      },
    });

    return id;
  },
});

/**
 * Mutation to delete an economic activity (admin only)
 * Prevents deletion if the activity is in use by any companies
 */
export const remove = mutation({
  args: { id: v.id("economicActivities") },
  handler: async (ctx, { id }) => {
    const userProfile = await requireAdmin(ctx);

    // Check if economic activity exists
    const activity = await ctx.db.get(id);
    if (!activity) {
      throw new Error("Economic activity not found");
    }

    // Check if activity is used by any companies
    const companiesUsingActivity = await ctx.db
      .query("companiesEconomicActivities")
      .withIndex("by_economicActivity", (q) => q.eq("economicActivityId", id))
      .collect();

    if (companiesUsingActivity.length > 0) {
      throw new Error(
        `Cannot delete this economic activity because it is used by ${companiesUsingActivity.length} company(ies)`
      );
    }

    // Safe to delete
    await ctx.db.delete(id);

    // Log deletion for audit trail
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId: userProfile.userId as Id<"users">,
      action: "deleted",
      entityType: "economicActivity",
      entityId: id,
      details: {
        name: activity.name,
      },
    });
  },
});
