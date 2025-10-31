import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

/**
 * Query to list all case statuses
 * Ordered by sortOrder by default
 */
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const statuses = await ctx.db
      .query("caseStatuses")
      .withIndex("by_sortOrder")
      .collect();

    if (args.includeInactive) {
      return statuses;
    }

    return statuses.filter((status) => status.isActive);
  },
});

/**
 * Query to list active case statuses only (most common use case)
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const statuses = await ctx.db
      .query("caseStatuses")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Sort by sortOrder manually since we're using by_active index
    return statuses.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Query to get a single case status by ID
 */
export const get = query({
  args: { id: v.id("caseStatuses") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Query to get a case status by code
 */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    return await ctx.db
      .query("caseStatuses")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
  },
});

/**
 * Query to get case statuses by category
 */
export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    const statuses = await ctx.db
      .query("caseStatuses")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();

    return statuses.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Mutation to create a new case status (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    nameEn: v.optional(v.string()),
    code: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Check if code already exists
    const existingByCode = await ctx.db
      .query("caseStatuses")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existingByCode) {
      throw new Error(`Case status with code "${args.code}" already exists`);
    }

    const now = Date.now();
    const caseStatusId = await ctx.db.insert("caseStatuses", {
      name: args.name,
      nameEn: args.nameEn,
      code: args.code,
      description: args.description,
      category: args.category,
      color: args.color,
      sortOrder: args.sortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return caseStatusId;
  },
});

/**
 * Mutation to update a case status (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("caseStatuses"),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Case status not found");
    }

    // If code is being changed, check if new code already exists
    if (args.code && args.code !== existing.code) {
      const newCode = args.code; // Type narrowing

      // Check if the case status is in use
      const inUse = await ctx.db
        .query("individualProcesses")
        .withIndex("by_caseStatus", (q) => q.eq("caseStatusId", id))
        .first();

      if (inUse) {
        throw new Error("Cannot change code of case status that is in use");
      }

      // Check if new code already exists
      const existingByCode = await ctx.db
        .query("caseStatuses")
        .withIndex("by_code", (q) => q.eq("code", newCode))
        .first();

      if (existingByCode) {
        throw new Error(`Case status with code "${newCode}" already exists`);
      }
    }

    await ctx.db.patch(id, {
      ...args,
      updatedAt: Date.now(),
    });

    return id;
  },
});

/**
 * Mutation to soft delete a case status (admin only)
 * Sets isActive to false instead of removing the record
 */
export const remove = mutation({
  args: { id: v.id("caseStatuses") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Case status not found");
    }

    // Check if the case status is in use
    const inUse = await ctx.db
      .query("individualProcesses")
      .withIndex("by_caseStatus", (q) => q.eq("caseStatusId", id))
      .first();

    if (inUse) {
      throw new Error(
        "Cannot delete case status that is in use. You can deactivate it instead."
      );
    }

    // Soft delete: set isActive to false
    await ctx.db.patch(id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return id;
  },
});

/**
 * Mutation to reorder case statuses (admin only)
 * Updates sortOrder for multiple statuses atomically
 */
export const reorder = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("caseStatuses"),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, { updates }) => {
    await requireAdmin(ctx);

    // Update all statuses with new sortOrder
    for (const update of updates) {
      await ctx.db.patch(update.id, {
        sortOrder: update.sortOrder,
        updatedAt: Date.now(),
      });
    }

    return { updated: updates.length };
  },
});

/**
 * Mutation to bulk toggle active status (admin only)
 */
export const toggleActive = mutation({
  args: {
    id: v.id("caseStatuses"),
    isActive: v.boolean(),
  },
  handler: async (ctx, { id, isActive }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Case status not found");
    }

    // If deactivating, check if in use
    if (!isActive) {
      const inUse = await ctx.db
        .query("individualProcesses")
        .withIndex("by_caseStatus", (q) => q.eq("caseStatusId", id))
        .first();

      if (inUse) {
        throw new Error(
          "Cannot deactivate case status that is in use"
        );
      }
    }

    await ctx.db.patch(id, {
      isActive,
      updatedAt: Date.now(),
    });

    return id;
  },
});
