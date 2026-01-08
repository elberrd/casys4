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
    orderNumber: v.optional(v.number()),
    fillableFields: v.optional(v.array(v.string())),
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

    // Check if orderNumber already exists (if provided)
    if (args.orderNumber !== undefined) {
      const existingByOrder = await ctx.db
        .query("caseStatuses")
        .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
        .first();

      if (existingByOrder) {
        throw new Error(`Case status with orderNumber ${args.orderNumber} already exists`);
      }
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
      orderNumber: args.orderNumber,
      fillableFields: args.fillableFields,
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
    orderNumber: v.optional(v.number()),
    fillableFields: v.optional(v.array(v.string())),
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

    // If orderNumber is being changed, check if new orderNumber already exists
    if (args.orderNumber !== undefined && args.orderNumber !== existing.orderNumber) {
      const existingByOrder = await ctx.db
        .query("caseStatuses")
        .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
        .first();

      if (existingByOrder && existingByOrder._id !== id) {
        throw new Error(`Case status with orderNumber ${args.orderNumber} already exists`);
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

/**
 * Query to get a case status by orderNumber
 */
export const getByOrderNumber = query({
  args: { orderNumber: v.number() },
  handler: async (ctx, { orderNumber }) => {
    return await ctx.db
      .query("caseStatuses")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", orderNumber))
      .first();
  },
});

/**
 * Query to get the next case status in the workflow sequence
 * Returns the next active status with orderNumber > currentOrderNumber
 *
 * NOTE: Some statuses (like "Exigência" and "Juntada de documento") don't have
 * an orderNumber because they can occur at any point in the workflow and are
 * not part of the sequential order. This function skips those statuses and
 * finds the next status with a valid orderNumber greater than the current one.
 */
export const getNextStatusByOrderNumber = query({
  args: { currentOrderNumber: v.optional(v.number()) },
  handler: async (ctx, { currentOrderNumber }) => {
    // If no current orderNumber provided, return null
    // This happens when current status doesn't have an orderNumber (like "Exigência")
    if (currentOrderNumber === undefined) {
      return null;
    }

    // Get all statuses with orderNumber defined
    // We need to filter in memory because we want the NEXT available orderNumber,
    // not just currentOrderNumber + 1 (which might not exist if there are gaps)
    const allStatuses = await ctx.db
      .query("caseStatuses")
      .collect();

    // Filter to find the next status:
    // 1. Must have an orderNumber defined
    // 2. orderNumber must be greater than current
    // 3. Must be active
    // Then sort by orderNumber and take the first one
    const nextStatus = allStatuses
      .filter(
        (s) =>
          s.isActive &&
          s.orderNumber !== undefined &&
          s.orderNumber > currentOrderNumber
      )
      .sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0))[0];

    return nextStatus || null;
  },
});

/**
 * Query to get fillable fields configuration for a case status
 * Returns the fillableFields array if it exists
 * Used by AddStatusDialog to dynamically render custom fields
 */
export const getFillableFieldsForCaseStatus = query({
  args: { caseStatusId: v.id("caseStatuses") },
  handler: async (ctx, { caseStatusId }) => {
    const caseStatus = await ctx.db.get(caseStatusId);

    if (!caseStatus) {
      return { fillableFields: undefined };
    }

    console.log('[getFillableFieldsForCaseStatus] caseStatusId:', caseStatusId);
    console.log('[getFillableFieldsForCaseStatus] caseStatus.code:', caseStatus.code);
    console.log('[getFillableFieldsForCaseStatus] caseStatus.fillableFields:', caseStatus.fillableFields);

    return {
      fillableFields: caseStatus.fillableFields
    };
  },
});
