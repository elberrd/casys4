import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

/**
 * Query to list all legal frameworks with optional isActive filter
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { isActive }) => {
    if (isActive !== undefined) {
      return await ctx.db
        .query("legalFrameworks")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
    }
    return await ctx.db.query("legalFrameworks").collect();
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
 * Query to get legal framework by code
 */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    return await ctx.db
      .query("legalFrameworks")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
  },
});

/**
 * Mutation to create legal framework (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    description: v.string(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // Check if code already exists
    const existing = await ctx.db
      .query("legalFrameworks")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error(`Legal framework with code ${args.code} already exists`);
    }

    const legalFrameworkId = await ctx.db.insert("legalFrameworks", {
      name: args.name,
      code: args.code.toUpperCase(),
      description: args.description,
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
    code: v.string(),
    description: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    await requireAdmin(ctx);

    // Check if another legal framework with this code exists
    const existing = await ctx.db
      .query("legalFrameworks")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing && existing._id !== id) {
      throw new Error(`Legal framework with code ${args.code} already exists`);
    }

    await ctx.db.patch(id, {
      name: args.name,
      code: args.code.toUpperCase(),
      description: args.description,
      isActive: args.isActive,
    });

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

    // Note: Add cascade checks here if there are related tables
    // For now, we'll just delete the legal framework
    await ctx.db.delete(id);
  },
});
