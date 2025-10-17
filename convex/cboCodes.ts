import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let cboCodes = await ctx.db.query("cboCodes").collect();

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      cboCodes = cboCodes.filter(
        (cbo) =>
          cbo.code.toLowerCase().includes(searchLower) ||
          cbo.title.toLowerCase().includes(searchLower) ||
          cbo.description.toLowerCase().includes(searchLower)
      );
    }

    return cboCodes;
  },
});

export const get = query({
  args: { id: v.id("cboCodes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const cboCodes = await ctx.db.query("cboCodes").collect();
    const searchLower = args.query.toLowerCase();

    return cboCodes
      .filter(
        (cbo) =>
          cbo.code.toLowerCase().includes(searchLower) ||
          cbo.title.toLowerCase().includes(searchLower)
      )
      .slice(0, 10); // Return max 10 results for typeahead
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate code
    const existing = await ctx.db
      .query("cboCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error("A CBO code with this code already exists");
    }

    return await ctx.db.insert("cboCodes", {
      code: args.code,
      title: args.title,
      description: args.description,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("cboCodes"),
    code: v.string(),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;

    // Check for duplicate code (excluding current record)
    const existing = await ctx.db
      .query("cboCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing && existing._id !== id) {
      throw new Error("A CBO code with this code already exists");
    }

    await ctx.db.patch(id, updateData);
  },
});

export const remove = mutation({
  args: { id: v.id("cboCodes") },
  handler: async (ctx, args) => {
    // TODO: Add cascade check when individual processes table is implemented
    // Check if any individual processes reference this CBO code
    await ctx.db.delete(args.id);
  },
});
