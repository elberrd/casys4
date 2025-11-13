import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to list all legal frameworks with optional filters
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results;

    if (args.isActive !== undefined) {
      // Filter by isActive if provided
      results = await ctx.db
        .query("legalFrameworks")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive))
        .collect();
    } else {
      results = await ctx.db.query("legalFrameworks").collect();
    }

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      results = results.filter((item) => {
        const name = normalizeString(item.name);
        const description = item.description ? normalizeString(item.description) : "";

        return (
          name.includes(searchNormalized) ||
          description.includes(searchNormalized)
        );
      });
    }

    return results;
  },
});

/**
 * Query to list only active legal frameworks
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("legalFrameworks")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

/**
 * Query to get legal framework by ID
 */
export const get = query({
  args: { id: v.id("legalFrameworks") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Query to get process types for a legal framework
 */
export const getProcessTypes = query({
  args: { legalFrameworkId: v.id("legalFrameworks") },
  handler: async (ctx, { legalFrameworkId }) => {
    const links = await ctx.db
      .query("processTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", legalFrameworkId))
      .collect();

    const processTypes = await Promise.all(
      links.map(async (link) => {
        const pt = await ctx.db.get(link.processTypeId);
        return pt ? { ...pt, _id: link.processTypeId } : null;
      })
    );

    return processTypes.filter((pt) => pt !== null);
  },
});

/**
 * Mutation to create legal framework (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const legalFrameworkId = await ctx.db.insert("legalFrameworks", {
      name: args.name,
      description: args.description ?? "",
      isActive: args.isActive ?? true,
    });

    return legalFrameworkId;
  },
});

/**
 * Mutation to update legal framework (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("legalFrameworks"),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    await requireAdmin(ctx);

    const updates: any = {
      name: args.name,
    };

    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(id, updates);

    return id;
  },
});

/**
 * Mutation to delete legal framework (admin only)
 */
export const remove = mutation({
  args: { id: v.id("legalFrameworks") },
  handler: async (ctx, { id }) => {
    // Require admin role
    await requireAdmin(ctx);

    // Delete all junction table records first
    const existingLinks = await ctx.db
      .query("processTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", id))
      .collect();

    for (const link of existingLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete the legal framework
    await ctx.db.delete(id);
  },
});
