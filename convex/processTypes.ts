import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

/**
 * Query to list all process types with optional isActive filter
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { isActive }) => {
    if (isActive !== undefined) {
      const results = await ctx.db
        .query("processTypes")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
      return results.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const results = await ctx.db.query("processTypes").collect();
    return results.sort((a, b) => a.sortOrder - b.sortOrder);
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
    return results.sort((a, b) => a.sortOrder - b.sortOrder);
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
 * Query to get process type by code
 */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    return await ctx.db
      .query("processTypes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
  },
});

/**
 * Mutation to create process type (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    description: v.string(),
    category: v.string(),
    estimatedDays: v.number(),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // Check if code already exists
    const existing = await ctx.db
      .query("processTypes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error(`Process type with code ${args.code} already exists`);
    }

    // Auto-increment sortOrder if not provided
    let sortOrder = args.sortOrder;
    if (sortOrder === undefined) {
      const allTypes = await ctx.db.query("processTypes").collect();
      sortOrder = allTypes.length > 0
        ? Math.max(...allTypes.map((t) => t.sortOrder)) + 1
        : 0;
    }

    const processTypeId = await ctx.db.insert("processTypes", {
      name: args.name,
      code: args.code.toUpperCase(),
      description: args.description,
      category: args.category,
      estimatedDays: args.estimatedDays,
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
    code: v.string(),
    description: v.string(),
    category: v.string(),
    estimatedDays: v.number(),
    isActive: v.boolean(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, sortOrder, ...args }) => {
    // Require admin role
    await requireAdmin(ctx);

    // Check if another process type with this code exists
    const existing = await ctx.db
      .query("processTypes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing && existing._id !== id) {
      throw new Error(`Process type with code ${args.code} already exists`);
    }

    const current = await ctx.db.get(id);
    if (!current) {
      throw new Error("Process type not found");
    }

    await ctx.db.patch(id, {
      name: args.name,
      code: args.code.toUpperCase(),
      description: args.description,
      category: args.category,
      estimatedDays: args.estimatedDays,
      isActive: args.isActive,
      sortOrder: sortOrder ?? current.sortOrder,
    });

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
