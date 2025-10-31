import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to list all process types with optional isActive filter
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results;
    if (args.isActive !== undefined) {
      results = await ctx.db
        .query("processTypes")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive))
        .collect();
    } else {
      results = await ctx.db.query("processTypes").collect();
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

    return results.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});

/**
 * Query to list only active process types
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const results = await ctx.db
      .query("processTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return results.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});

/**
 * Query to get process type by ID
 */
export const get = query({
  args: { id: v.id("processTypes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});


/**
 * Mutation to create process type (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    estimatedDays: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // Auto-increment sortOrder if not provided
    let sortOrder = args.sortOrder;
    if (sortOrder === undefined) {
      const allTypes = await ctx.db.query("processTypes").collect();
      sortOrder = allTypes.length > 0
        ? Math.max(...allTypes.map((t) => t.sortOrder ?? 0)) + 1
        : 0;
    }

    const processTypeId = await ctx.db.insert("processTypes", {
      name: args.name,
      description: args.description ?? "",
      estimatedDays: args.estimatedDays ?? 0,
      isActive: args.isActive ?? true,
      sortOrder,
    });

    return processTypeId;
  },
});

/**
 * Mutation to update process type (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("processTypes"),
    name: v.string(),
    description: v.optional(v.string()),
    estimatedDays: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, sortOrder, ...args }) => {
    // Require admin role
    await requireAdmin(ctx);

    const current = await ctx.db.get(id);
    if (!current) {
      throw new Error("Process type not found");
    }

    const updates: any = {
      name: args.name,
      sortOrder: sortOrder ?? current.sortOrder,
    };

    if (args.description !== undefined) updates.description = args.description;
    if (args.estimatedDays !== undefined) updates.estimatedDays = args.estimatedDays;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(id, updates);

    return id;
  },
});

/**
 * Mutation to delete process type (admin only)
 */
export const remove = mutation({
  args: { id: v.id("processTypes") },
  handler: async (ctx, { id }) => {
    // Require admin role
    await requireAdmin(ctx);

    // Note: Add cascade checks here if there are related tables
    // For now, we'll just delete the process type
    await ctx.db.delete(id);
  },
});

/**
 * Mutation to reorder process types (admin only)
 */
export const reorder = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("processTypes"),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, { updates }) => {
    // Require admin role
    await requireAdmin(ctx);

    for (const update of updates) {
      await ctx.db.patch(update.id, { sortOrder: update.sortOrder });
    }
  },
});
