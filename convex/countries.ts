import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Query to list all countries
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("countries").collect();
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
 * Mutation to create country
 */
export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const countryId = await ctx.db.insert("countries", {
      name: args.name,
    });

    return countryId;
  },
});

/**
 * Mutation to update country
 */
export const update = mutation({
  args: {
    id: v.id("countries"),
    name: v.string(),
  },
  handler: async (ctx, { id, name }) => {
    await ctx.db.patch(id, {
      name,
    });

    return id;
  },
});

/**
 * Mutation to delete country
 */
export const remove = mutation({
  args: { id: v.id("countries") },
  handler: async (ctx, { id }) => {
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
