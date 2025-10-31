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
    processTypeId: v.optional(v.id("processTypes")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results;

    // Filter by processTypeId if provided
    if (args.processTypeId !== undefined) {
      results = await ctx.db
        .query("legalFrameworks")
        .withIndex("by_processType", (q) => q.eq("processTypeId", args.processTypeId))
        .collect();
    } else if (args.isActive !== undefined) {
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
 * Query to get legal frameworks by Process Type
 */
export const listByProcessType = query({
  args: { processTypeId: v.id("processTypes") },
  handler: async (ctx, { processTypeId }) => {
    return await ctx.db
      .query("legalFrameworks")
      .withIndex("by_processType", (q) => q.eq("processTypeId", processTypeId))
      .collect();
  },
});

/**
 * Mutation to create legal framework (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    processTypeId: v.optional(v.id("processTypes")),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // Verify that the process type exists if provided
    if (args.processTypeId) {
      const processType = await ctx.db.get(args.processTypeId);
      if (!processType) {
        throw new Error("Process Type not found");
      }
    }

    const legalFrameworkId = await ctx.db.insert("legalFrameworks", {
      name: args.name,
      processTypeId: args.processTypeId,
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
    processTypeId: v.optional(v.id("processTypes")),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    await requireAdmin(ctx);

    // Verify that the process type exists if provided
    if (args.processTypeId) {
      const processType = await ctx.db.get(args.processTypeId);
      if (!processType) {
        throw new Error("Process Type not found");
      }
    }

    const updates: any = {
      name: args.name,
    };

    if (args.processTypeId !== undefined) updates.processTypeId = args.processTypeId;
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

    // Note: Add cascade checks here if there are related tables
    // For now, we'll just delete the legal framework
    await ctx.db.delete(id);
  },
});
