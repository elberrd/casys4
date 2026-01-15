import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to list all countries with optional accent-insensitive search
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let countries = await ctx.db.query("countries").collect();

    // Filter by search query if provided (accent-insensitive)
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      countries = countries.filter((country) =>
        normalizeString(country.name).includes(searchNormalized)
      );
    }

    return countries;
  },
});

/**
 * Query to get country by ID
 */
export const get = query({
  args: { id: v.id("countries") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Mutation to create country (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    flag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    const countryId = await ctx.db.insert("countries", {
      name: args.name,
      code: "",
      iso3: "",
      flag: args.flag,
    });

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "countries",
        entityId: countryId,
        details: {
          name: args.name,
        },
      });
    }

    return countryId;
  },
});

/**
 * Mutation to update country (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("countries"),
    name: v.string(),
    flag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    await ctx.db.patch(args.id, {
      name: args.name,
      flag: args.flag,
    });

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "updated",
        entityType: "countries",
        entityId: args.id,
        details: {
          name: args.name,
        },
      });
    }

    return args.id;
  },
});

/**
 * Mutation to delete country (admin only)
 */
export const remove = mutation({
  args: { id: v.id("countries") },
  handler: async (ctx, { id }) => {
    const userProfile = await requireAdmin(ctx);

    // Get country data before deletion for logging
    const country = await ctx.db.get(id);
    if (!country) {
      throw new Error("Country not found");
    }

    // Check if there are states associated with this country
    const states = await ctx.db
      .query("states")
      .withIndex("by_country", (q) => q.eq("countryId", id))
      .first();

    if (states) {
      throw new Error("Cannot delete country with associated states");
    }

    await ctx.db.delete(id);

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "countries",
        entityId: id,
        details: {
          name: country.name,
        },
      });
    }
  },
});
