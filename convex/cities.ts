import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

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

    const state = city.stateId ? await ctx.db.get(city.stateId) : null;

    // Fetch country from city's direct relationship (if exists)
    const cityCountry = city.countryId ? await ctx.db.get(city.countryId) : null;

    // Fallback to state's country if city doesn't have one
    const country = cityCountry || (state?.countryId ? await ctx.db.get(state.countryId) : null);

    return {
      ...city,
      state,
      country,
    };
  },
});

/**
 * Query to get all cities with state and country information
 * Supports accent-insensitive search across city, state, and country names
 */
export const listWithRelations = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cities = await ctx.db.query("cities").collect();

    const citiesWithRelations = await Promise.all(
      cities.map(async (city) => {
        const state = city.stateId ? await ctx.db.get(city.stateId) : null;

        // Fetch country from city's direct relationship (if exists)
        const cityCountry = city.countryId ? await ctx.db.get(city.countryId) : null;

        // Fallback to state's country if city doesn't have one
        const country = cityCountry || (state?.countryId ? await ctx.db.get(state.countryId) : null);

        return {
          ...city,
          state,
          country,
        };
      })
    );

    // Filter by search query if provided (accent-insensitive)
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      return citiesWithRelations.filter(
        (city) =>
          normalizeString(city.name).includes(searchNormalized) ||
          (city.state && normalizeString(city.state.name).includes(searchNormalized)) ||
          (city.country && normalizeString(city.country.name).includes(searchNormalized))
      );
    }

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
 * Mutation to create city (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    stateId: v.optional(v.id("states")),
    countryId: v.optional(v.id("countries")),
    hasFederalPolice: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Check if state exists (when provided)
    if (args.stateId) {
      const state = await ctx.db.get(args.stateId);
      if (!state) {
        throw new Error("State not found");
      }
    }

    // Check if country exists (when provided)
    if (args.countryId) {
      const country = await ctx.db.get(args.countryId);
      if (!country) {
        throw new Error("Country not found");
      }
    }

    const cityId = await ctx.db.insert("cities", {
      name: args.name,
      stateId: args.stateId,
      countryId: args.countryId,
      hasFederalPolice: args.hasFederalPolice ?? false,
    });

    return cityId;
  },
});

/**
 * Mutation to update city (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("cities"),
    name: v.string(),
    stateId: v.optional(v.id("states")),
    countryId: v.optional(v.id("countries")),
    hasFederalPolice: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    await requireAdmin(ctx);

    // Check if state exists (when provided)
    if (args.stateId) {
      const state = await ctx.db.get(args.stateId);
      if (!state) {
        throw new Error("State not found");
      }
    }

    // Check if country exists (when provided)
    if (args.countryId) {
      const country = await ctx.db.get(args.countryId);
      if (!country) {
        throw new Error("Country not found");
      }
    }

    await ctx.db.patch(id, {
      name: args.name,
      stateId: args.stateId,
      countryId: args.countryId,
      hasFederalPolice: args.hasFederalPolice ?? false,
    });

    return id;
  },
});

/**
 * Mutation to delete city (admin only)
 */
export const remove = mutation({
  args: { id: v.id("cities") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);

    // Note: Add cascade checks here if there are related tables
    // For now, we'll just delete the city
    await ctx.db.delete(id);
  },
});
