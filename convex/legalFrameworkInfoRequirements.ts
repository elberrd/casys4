import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Query to list all info requirements for a specific legal framework
 */
export const listByLegalFramework = query({
  args: {
    legalFrameworkId: v.id("legalFrameworks"),
  },
  handler: async (ctx, args) => {
    const requirements = await ctx.db
      .query("legalFrameworkInfoRequirements")
      .withIndex("by_legalFramework", (q) =>
        q.eq("legalFrameworkId", args.legalFrameworkId)
      )
      .collect();

    return requirements
      .filter((r) => r.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Query to list all info requirements for a legal framework (including inactive)
 */
export const listAllByLegalFramework = query({
  args: {
    legalFrameworkId: v.id("legalFrameworks"),
  },
  handler: async (ctx, args) => {
    const requirements = await ctx.db
      .query("legalFrameworkInfoRequirements")
      .withIndex("by_legalFramework", (q) =>
        q.eq("legalFrameworkId", args.legalFrameworkId)
      )
      .collect();

    return requirements.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Mutation to create a new info requirement
 */
export const create = mutation({
  args: {
    legalFrameworkId: v.id("legalFrameworks"),
    entityType: v.string(),
    fieldPath: v.string(),
    label: v.string(),
    labelEn: v.optional(v.string()),
    fieldType: v.optional(v.string()),
    responsibleParty: v.string(),
    isRequired: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    const id = await ctx.db.insert("legalFrameworkInfoRequirements", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
      createdBy: userProfile.userId,
    });

    return id;
  },
});

/**
 * Mutation to create multiple info requirements at once
 */
export const bulkCreate = mutation({
  args: {
    legalFrameworkId: v.id("legalFrameworks"),
    items: v.array(
      v.object({
        entityType: v.string(),
        fieldPath: v.string(),
        label: v.string(),
        labelEn: v.optional(v.string()),
        fieldType: v.optional(v.string()),
        responsibleParty: v.string(),
        isRequired: v.boolean(),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    const now = Date.now();
    const ids = [];

    for (const item of args.items) {
      const id = await ctx.db.insert("legalFrameworkInfoRequirements", {
        legalFrameworkId: args.legalFrameworkId,
        ...item,
        isActive: true,
        createdAt: now,
        createdBy: userProfile.userId,
      });
      ids.push(id);
    }

    return ids;
  },
});

/**
 * Mutation to update an info requirement
 */
export const update = mutation({
  args: {
    id: v.id("legalFrameworkInfoRequirements"),
    entityType: v.optional(v.string()),
    fieldPath: v.optional(v.string()),
    label: v.optional(v.string()),
    labelEn: v.optional(v.string()),
    fieldType: v.optional(v.string()),
    responsibleParty: v.optional(v.string()),
    isRequired: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    const { id, ...data } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Info requirement not found");
    }

    const updates: Record<string, any> = {};
    if (data.entityType !== undefined) updates.entityType = data.entityType;
    if (data.fieldPath !== undefined) updates.fieldPath = data.fieldPath;
    if (data.label !== undefined) updates.label = data.label;
    if (data.labelEn !== undefined) updates.labelEn = data.labelEn;
    if (data.fieldType !== undefined) updates.fieldType = data.fieldType;
    if (data.responsibleParty !== undefined) updates.responsibleParty = data.responsibleParty;
    if (data.isRequired !== undefined) updates.isRequired = data.isRequired;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    updates.updatedAt = Date.now();
    updates.updatedBy = userProfile.userId;

    await ctx.db.patch(id, updates);
    return id;
  },
});

/**
 * Mutation to remove an info requirement
 */
export const remove = mutation({
  args: {
    id: v.id("legalFrameworkInfoRequirements"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/**
 * Mutation to reorder info requirements
 */
export const reorder = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.id("legalFrameworkInfoRequirements"),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    for (const item of args.items) {
      await ctx.db.patch(item.id, { sortOrder: item.sortOrder });
    }
  },
});
