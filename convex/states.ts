import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to list all states with optional country filter
 */
export const list = query({
  args: {
    countryId: v.optional(v.id("countries")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let states;
    if (args.countryId) {
      states = await ctx.db
        .query("states")
        .withIndex("by_country", (q) => q.eq("countryId", args.countryId))
        .collect();
    } else {
      states = await ctx.db.query("states").collect();
    }

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      states = states.filter((state) =>
        normalizeString(state.name).includes(searchNormalized)
      );
    }

    return states;
  },
});

/**
 * Query to get state by ID with country information
 */
export const get = query({
  args: { id: v.id("states") },
  handler: async (ctx, { id }) => {
    const state = await ctx.db.get(id);
    if (!state) return null;

    const country = state.countryId ? await ctx.db.get(state.countryId) : null;
    return {
      ...state,
      country,
    };
  },
});

/**
 * Query to get all states with country information
 */
export const listWithCountry = query({
  args: {},
  handler: async (ctx) => {
    const states = await ctx.db.query("states").collect();

    const statesWithCountry = await Promise.all(
      states.map(async (state) => {
        const country = state.countryId ? await ctx.db.get(state.countryId) : null;
        return {
          ...state,
          country: country
            ? {
                name: country.name,
                code: country.code,
              }
            : null,
        };
      })
    );

    return statesWithCountry;
  },
});

/**
 * Mutation to create state (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    countryId: v.optional(v.id("countries")),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    // Check if country exists (when provided)
    if (args.countryId) {
      const country = await ctx.db.get(args.countryId);
      if (!country) {
        throw new Error("Country not found");
      }
    }

    // Check if state code already exists (when provided)
    if (args.code) {
      const existing = await ctx.db
        .query("states")
        .withIndex("by_code", (q) => q.eq("code", args.code))
        .first();

      if (existing) {
        throw new Error("State with this code already exists");
      }
    }

    const stateId = await ctx.db.insert("states", {
      name: args.name,
      code: args.code ? args.code.toUpperCase() : undefined,
      countryId: args.countryId,
    });

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "states",
        entityId: stateId,
        details: {
          name: args.name,
          code: args.code,
        },
      });
    }

    return stateId;
  },
});

/**
 * Mutation to update state (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("states"),
    name: v.string(),
    code: v.optional(v.string()),
    countryId: v.optional(v.id("countries")),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    // Check if country exists (when provided)
    if (args.countryId) {
      const country = await ctx.db.get(args.countryId);
      if (!country) {
        throw new Error("Country not found");
      }
    }

    // Check if another state with this code exists (when provided)
    if (args.code) {
      const existing = await ctx.db
        .query("states")
        .withIndex("by_code", (q) => q.eq("code", args.code))
        .first();

      if (existing && existing._id !== args.id) {
        throw new Error("Another state with this code already exists");
      }
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      code: args.code ? args.code.toUpperCase() : undefined,
      countryId: args.countryId,
    });

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "updated",
        entityType: "states",
        entityId: args.id,
        details: {
          name: args.name,
          code: args.code,
        },
      });
    }

    return args.id;
  },
});

/**
 * Mutation to delete state (admin only)
 */
export const remove = mutation({
  args: { id: v.id("states") },
  handler: async (ctx, { id }) => {
    const userProfile = await requireAdmin(ctx);

    // Get state data before deletion for logging
    const state = await ctx.db.get(id);
    if (!state) {
      throw new Error("State not found");
    }

    // Check if there are cities associated with this state
    const cities = await ctx.db
      .query("cities")
      .withIndex("by_state", (q) => q.eq("stateId", id))
      .first();

    if (cities) {
      throw new Error("Cannot delete state with associated cities");
    }

    await ctx.db.delete(id);

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "states",
        entityId: id,
        details: {
          name: state.name,
          code: state.code,
        },
      });
    }
  },
});
