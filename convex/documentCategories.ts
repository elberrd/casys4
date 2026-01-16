import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to list all document categories with optional filters
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let categories = await ctx.db.query("documentCategories").collect();

    if (args.isActive !== undefined) {
      categories = categories.filter((c) => c.isActive === args.isActive);
    }

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      categories = categories.filter((item) => {
        const name = normalizeString(item.name);
        const code = normalizeString(item.code);
        const description = item.description
          ? normalizeString(item.description)
          : "";

        return (
          name.includes(searchNormalized) ||
          code.includes(searchNormalized) ||
          description.includes(searchNormalized)
        );
      });
    }

    // Sort by name
    categories.sort((a, b) => a.name.localeCompare(b.name));

    return categories;
  },
});

/**
 * Query to list only active document categories
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("documentCategories")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Sort by name
    categories.sort((a, b) => a.name.localeCompare(b.name));

    return categories;
  },
});

/**
 * Query to get a single document category by ID
 */
export const get = query({
  args: { id: v.id("documentCategories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Query to get a document category by code
 */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentCategories")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

/**
 * Mutation to create a new document category (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    // Normalize and validate code
    const normalizedCode = args.code.toUpperCase().replace(/\s+/g, "_");

    // Check for duplicate code
    const existing = await ctx.db
      .query("documentCategories")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    if (existing) {
      throw new Error("A document category with this code already exists");
    }

    const categoryId = await ctx.db.insert("documentCategories", {
      name: args.name,
      code: normalizedCode,
      description: args.description ?? "",
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
      createdBy: userProfile.userId,
    });

    return categoryId;
  },
});

/**
 * Mutation to update a document category (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("documentCategories"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    const { id, ...updateData } = args;

    // If code is being updated, check for duplicates
    if (updateData.code !== undefined) {
      const normalizedCode = updateData.code.toUpperCase().replace(/\s+/g, "_");
      const existing = await ctx.db
        .query("documentCategories")
        .withIndex("by_code", (q) => q.eq("code", normalizedCode))
        .first();

      if (existing && existing._id !== id) {
        throw new Error("A document category with this code already exists");
      }

      updateData.code = normalizedCode;
    }

    await ctx.db.patch(id, {
      ...(updateData.name !== undefined && { name: updateData.name }),
      ...(updateData.code !== undefined && { code: updateData.code }),
      ...(updateData.description !== undefined && {
        description: updateData.description,
      }),
      ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      updatedAt: Date.now(),
      updatedBy: userProfile.userId,
    });

    return id;
  },
});

/**
 * Mutation to deactivate a document category (soft delete) (admin only)
 */
export const remove = mutation({
  args: { id: v.id("documentCategories") },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    // Soft delete by setting isActive to false
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
      updatedBy: userProfile.userId,
    });
  },
});

/**
 * Mutation to toggle the active status of a document category (admin only)
 */
export const toggleActive = mutation({
  args: { id: v.id("documentCategories") },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Document category not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !category.isActive,
      updatedAt: Date.now(),
      updatedBy: userProfile.userId,
    });
  },
});
