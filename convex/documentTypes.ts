import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

export const list = query({
  args: {
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let documentTypes = await ctx.db.query("documentTypes").collect();

    if (args.category !== undefined) {
      documentTypes = documentTypes.filter((dt) => dt.category === args.category);
    }

    if (args.isActive !== undefined) {
      documentTypes = documentTypes.filter((dt) => dt.isActive === args.isActive);
    }

    return documentTypes;
  },
});

export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentTypes")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("documentTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("documentTypes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Mutation to create a new document type (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    category: v.string(),
    description: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // Check for duplicate code
    const existing = await ctx.db
      .query("documentTypes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error("A document type with this code already exists");
    }

    return await ctx.db.insert("documentTypes", {
      name: args.name,
      code: args.code.toUpperCase().replace(/\s+/g, ""),
      category: args.category,
      description: args.description,
      isActive: args.isActive,
    });
  },
});

/**
 * Mutation to update a document type (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("documentTypes"),
    name: v.string(),
    code: v.string(),
    category: v.string(),
    description: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const { id, ...updateData } = args;

    // Check for duplicate code (excluding current record)
    const existing = await ctx.db
      .query("documentTypes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing && existing._id !== id) {
      throw new Error("A document type with this code already exists");
    }

    await ctx.db.patch(id, {
      ...updateData,
      code: updateData.code.toUpperCase().replace(/\s+/g, ""),
    });
  },
});

/**
 * Mutation to delete a document type (admin only)
 */
export const remove = mutation({
  args: { id: v.id("documentTypes") },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // TODO: Add cascade check when document requirements table is implemented
    // Check if any document requirements reference this document type
    await ctx.db.delete(args.id);
  },
});
