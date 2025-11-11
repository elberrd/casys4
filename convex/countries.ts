import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
    await requireAdmin(ctx);

    const countryId = await ctx.db.insert("countries", {
      name: args.name,
      code: "",
      iso3: "",
      flag: args.flag,
    });

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
    await requireAdmin(ctx);

    await ctx.db.patch(args.id, {
      name: args.name,
      flag: args.flag,
    });

    return args.id;
  },
});

/**
 * Mutation to delete country (admin only)
 */
export const remove = mutation({
  args: { id: v.id("countries") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);

    // Check if there are states associated with this country
    const states = await ctx.db
      .query("states")
      .withIndex("by_country", (q) => q.eq("countryId", id))
      .first();

    if (states) {
      throw new Error("Cannot delete country with associated states");
    }

    await ctx.db.delete(id);
  },
});
