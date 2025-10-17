import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Query to list all states with optional country filter
 */
export const list = query({
  args: {
    countryId: v.optional(v.id("countries")),
  },
  handler: async (ctx, { countryId }) => {
    if (countryId) {
      return await ctx.db
        .query("states")
        .withIndex("by_country", (q) => q.eq("countryId", countryId))
        .collect();
    }
    return await ctx.db.query("states").collect();
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

    const country = await ctx.db.get(state.countryId);
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
        const country = await ctx.db.get(state.countryId);
        return {
          ...state,
          country,
        };
      })
    );

    return statesWithCountry;
  },
});

/**
 * Mutation to create state
 */
export const create = mutation({
  args: {
    name: v.string(),
    countryId: v.id("countries"),
  },
  handler: async (ctx, args) => {
    // Check if country exists
    const country = await ctx.db.get(args.countryId);
    if (!country) {
      throw new Error("Country not found");
    }

    const stateId = await ctx.db.insert("states", {
      name: args.name,
      countryId: args.countryId,
    });

    return stateId;
  },
});

/**
 * Mutation to update state
 */
export const update = mutation({
  args: {
    id: v.id("states"),
    name: v.string(),
    countryId: v.id("countries"),
  },
  handler: async (ctx, { id, name, countryId }) => {
    // Check if country exists
    const country = await ctx.db.get(countryId);
    if (!country) {
      throw new Error("Country not found");
    }

    await ctx.db.patch(id, {
      name,
      countryId,
    });

    return id;
  },
});

/**
 * Mutation to delete state
 */
export const remove = mutation({
  args: { id: v.id("states") },
  handler: async (ctx, { id }) => {
    // Check if there are cities associated with this state
    const cities = await ctx.db
      .query("cities")
      .withIndex("by_state", (q) => q.eq("stateId", id))
      .first();

    if (cities) {
      throw new Error("Cannot delete state with associated cities");
    }

    await ctx.db.delete(id);
  },
});
