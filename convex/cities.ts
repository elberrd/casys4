import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Query to list all cities with optional state filter
 */
export const list = query({
  args: {
    stateId: v.optional(v.id("states")),
  },
  handler: async (ctx, { stateId }) => {
    if (stateId) {
      return await ctx.db
        .query("cities")
        .withIndex("by_state", (q) => q.eq("stateId", stateId))
        .collect();
    }
    return await ctx.db.query("cities").collect();
  },
});

/**
 * Query to get city by ID with state and country information
 */
export const get = query({
  args: { id: v.id("cities") },
  handler: async (ctx, { id }) => {
    const city = await ctx.db.get(id);
    if (!city) return null;

    const state = await ctx.db.get(city.stateId);
    if (!state) return { ...city, state: null, country: null };

    const country = await ctx.db.get(state.countryId);
    return {
      ...city,
      state,
      country,
    };
  },
});

/**
 * Query to get all cities with state and country information
 */
export const listWithRelations = query({
  args: {},
  handler: async (ctx) => {
    const cities = await ctx.db.query("cities").collect();

    const citiesWithRelations = await Promise.all(
      cities.map(async (city) => {
        const state = await ctx.db.get(city.stateId);
        if (!state) return { ...city, state: null, country: null };

        const country = await ctx.db.get(state.countryId);
        return {
          ...city,
          state,
          country,
        };
      })
    );

    return citiesWithRelations;
  },
});

/**
 * Query to get cities by state
 */
export const getByState = query({
  args: { stateId: v.id("states") },
  handler: async (ctx, { stateId }) => {
    return await ctx.db
      .query("cities")
      .withIndex("by_state", (q) => q.eq("stateId", stateId))
      .collect();
  },
});

/**
 * Query to get cities with Federal Police office
 */
export const getWithFederalPolice = query({
  args: {},
  handler: async (ctx) => {
    const cities = await ctx.db.query("cities").collect();
    return cities.filter((city) => city.hasFederalPolice);
  },
});

/**
 * Mutation to create city
 */
export const create = mutation({
  args: {
    name: v.string(),
    stateId: v.id("states"),
    hasFederalPolice: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if state exists
    const state = await ctx.db.get(args.stateId);
    if (!state) {
      throw new Error("State not found");
    }

    const cityId = await ctx.db.insert("cities", {
      name: args.name,
      stateId: args.stateId,
      hasFederalPolice: args.hasFederalPolice,
    });

    return cityId;
  },
});

/**
 * Mutation to update city
 */
export const update = mutation({
  args: {
    id: v.id("cities"),
    name: v.string(),
    stateId: v.id("states"),
    hasFederalPolice: v.boolean(),
  },
  handler: async (ctx, { id, ...args }) => {
    // Check if state exists
    const state = await ctx.db.get(args.stateId);
    if (!state) {
      throw new Error("State not found");
    }

    await ctx.db.patch(id, {
      name: args.name,
      stateId: args.stateId,
      hasFederalPolice: args.hasFederalPolice,
    });

    return id;
  },
});

/**
 * Mutation to delete city
 */
export const remove = mutation({
  args: { id: v.id("cities") },
  handler: async (ctx, { id }) => {
    // Note: Add cascade checks here if there are related tables
    // For now, we'll just delete the city
    await ctx.db.delete(id);
  },
});
