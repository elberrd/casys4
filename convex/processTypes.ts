import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to list all authorization types with optional isActive filter
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
 * Query to list only active authorization types
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
 * Query to get authorization type by ID
 */
export const get = query({
  args: { id: v.id("processTypes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Query to get legal frameworks for an authorization type
 */
export const getLegalFrameworks = query({
  args: { processTypeId: v.id("processTypes") },
  handler: async (ctx, { processTypeId }) => {
    const links = await ctx.db
      .query("processTypesLegalFrameworks")
      .withIndex("by_processType", (q) => q.eq("processTypeId", processTypeId))
      .collect();

    const legalFrameworks = await Promise.all(
      links.map(async (link) => {
        const lf = await ctx.db.get(link.legalFrameworkId);
        return lf ? { ...lf, _id: link.legalFrameworkId } : null;
      })
    );

    // Filter out null values and inactive legal frameworks
    return legalFrameworks
      .filter((lf) => lf !== null && lf.isActive)
      .sort((a, b) => a!.name.localeCompare(b!.name));
  },
});

/**
 * Query to list authorization types with their legal frameworks
 */
export const listWithLegalFrameworks = query({
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

    // Load legal frameworks for each authorization type
    const processTypesWithLegalFrameworks = await Promise.all(
      results.map(async (processType) => {
        const links = await ctx.db
          .query("processTypesLegalFrameworks")
          .withIndex("by_processType", (q) => q.eq("processTypeId", processType._id))
          .collect();

        const legalFrameworks = await Promise.all(
          links.map(async (link) => {
            const lf = await ctx.db.get(link.legalFrameworkId);
            return lf ? { ...lf, _id: link.legalFrameworkId } : null;
          })
        );

        return {
          ...processType,
          legalFrameworks: legalFrameworks.filter((lf) => lf !== null),
        };
      })
    );

    return processTypesWithLegalFrameworks.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});


/**
 * Mutation to create authorization type (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    estimatedDays: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    legalFrameworkIds: v.optional(v.array(v.id("legalFrameworks"))),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const user = await requireAdmin(ctx);

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

    // Create junction table records for legal frameworks
    if (args.legalFrameworkIds && args.legalFrameworkIds.length > 0 && user.userId) {
      const now = Date.now();
      for (const legalFrameworkId of args.legalFrameworkIds) {
        await ctx.db.insert("processTypesLegalFrameworks", {
          processTypeId,
          legalFrameworkId,
          createdAt: now,
          createdBy: user.userId,
        });
      }
    }

    // Log activity
    if (user.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: user.userId,
        action: "created",
        entityType: "processTypes",
        entityId: processTypeId,
        details: {
          name: args.name,
          description: args.description,
          isActive: args.isActive ?? true,
        },
      });
    }

    return processTypeId;
  },
});

/**
 * Mutation to update authorization type (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("processTypes"),
    name: v.string(),
    description: v.optional(v.string()),
    estimatedDays: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    legalFrameworkIds: v.optional(v.array(v.id("legalFrameworks"))),
  },
  handler: async (ctx, { id, sortOrder, legalFrameworkIds, ...args }) => {
    // Require admin role
    const user = await requireAdmin(ctx);

    const current = await ctx.db.get(id);
    if (!current) {
      throw new Error("Authorization type not found");
    }

    const updates: any = {
      name: args.name,
      sortOrder: sortOrder ?? current.sortOrder,
    };

    if (args.description !== undefined) updates.description = args.description;
    if (args.estimatedDays !== undefined) updates.estimatedDays = args.estimatedDays;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(id, updates);

    // Update legal frameworks if provided
    if (legalFrameworkIds !== undefined) {
      // Remove all existing links
      const existingLinks = await ctx.db
        .query("processTypesLegalFrameworks")
        .withIndex("by_processType", (q) => q.eq("processTypeId", id))
        .collect();

      for (const link of existingLinks) {
        await ctx.db.delete(link._id);
      }

      // Create new links
      if (user.userId) {
        const now = Date.now();
        for (const legalFrameworkId of legalFrameworkIds) {
          await ctx.db.insert("processTypesLegalFrameworks", {
            processTypeId: id,
            legalFrameworkId,
            createdAt: now,
            createdBy: user.userId,
          });
        }
      }
    }

    // Log activity
    if (user.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: user.userId,
        action: "updated",
        entityType: "processTypes",
        entityId: id,
        details: {
          name: args.name,
          description: args.description,
          isActive: args.isActive,
        },
      });
    }

    return id;
  },
});

/**
 * Mutation to delete authorization type (admin only)
 */
export const remove = mutation({
  args: { id: v.id("processTypes") },
  handler: async (ctx, { id }) => {
    // Require admin role
    const user = await requireAdmin(ctx);

    // Get process type data before deletion for logging
    const processType = await ctx.db.get(id);
    if (!processType) {
      throw new Error("Process type not found");
    }

    // Delete all junction table records first
    const existingLinks = await ctx.db
      .query("processTypesLegalFrameworks")
      .withIndex("by_processType", (q) => q.eq("processTypeId", id))
      .collect();

    for (const link of existingLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete the authorization type
    await ctx.db.delete(id);

    // Log activity
    if (user.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: user.userId,
        action: "deleted",
        entityType: "processTypes",
        entityId: id,
        details: {
          name: processType.name,
        },
      });
    }
  },
});

/**
 * Mutation to reorder authorization types (admin only)
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
    const user = await requireAdmin(ctx);

    for (const update of updates) {
      await ctx.db.patch(update.id, { sortOrder: update.sortOrder });
    }

    // Log activity
    if (user.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: user.userId,
        action: "reordered",
        entityType: "processTypes",
        entityId: "bulk",
        details: {
          count: updates.length,
        },
      });
    }
  },
});
