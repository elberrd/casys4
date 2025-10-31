import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let cboCodes = await ctx.db.query("cboCodes").collect();

    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      cboCodes = cboCodes.filter(
        (cbo) =>
          (cbo.code && normalizeString(cbo.code).includes(searchNormalized)) ||
          normalizeString(cbo.title).includes(searchNormalized) ||
          (cbo.description && normalizeString(cbo.description).includes(searchNormalized))
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
    const searchNormalized = normalizeString(args.query);

    return cboCodes
      .filter(
        (cbo) =>
          (cbo.code && normalizeString(cbo.code).includes(searchNormalized)) ||
          normalizeString(cbo.title).includes(searchNormalized)
      )
      .slice(0, 10); // Return max 10 results for typeahead
  },
});

/**
 * Mutation to create CBO code (admin only)
 */
export const create = mutation({
  args: {
    code: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Check for duplicate code only if code is provided
    if (args.code) {
      const existing = await ctx.db
        .query("cboCodes")
        .withIndex("by_code", (q) => q.eq("code", args.code))
        .first();

      if (existing) {
        throw new Error("A CBO code with this code already exists");
      }
    }

    return await ctx.db.insert("cboCodes", {
      code: args.code,
      title: args.title,
      description: args.description,
    });
  },
});

/**
 * Mutation to update CBO code (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("cboCodes"),
    code: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...updateData } = args;

    // Check for duplicate code (excluding current record) only if code is provided
    if (args.code) {
      const existing = await ctx.db
        .query("cboCodes")
        .withIndex("by_code", (q) => q.eq("code", args.code))
        .first();

      if (existing && existing._id !== id) {
        throw new Error("A CBO code with this code already exists");
      }
    }

    await ctx.db.patch(id, updateData);
  },
});

/**
 * Mutation to delete CBO code (admin only)
 */
export const remove = mutation({
  args: { id: v.id("cboCodes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // TODO: Add cascade check when individual processes table is implemented
    // Check if any individual processes reference this CBO code
    await ctx.db.delete(args.id);
  },
});
