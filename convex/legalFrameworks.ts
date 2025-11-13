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
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results;

    if (args.isActive !== undefined) {
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

    // Get process types for each legal framework
    const resultsWithProcessTypes = await Promise.all(
      results.map(async (legalFramework) => {
        const links = await ctx.db
          .query("processTypesLegalFrameworks")
          .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", legalFramework._id))
          .collect();

        const processTypes = await Promise.all(
          links.map(async (link) => {
            const pt = await ctx.db.get(link.processTypeId);
            return pt ? { ...pt, _id: link.processTypeId } : null;
          })
        );

        return {
          ...legalFramework,
          processTypes: processTypes.filter((pt) => pt !== null),
        };
      })
    );

    return resultsWithProcessTypes;
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
    const legalFramework = await ctx.db.get(id);
    if (!legalFramework) return null;

    // Get process types for this legal framework
    const links = await ctx.db
      .query("processTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", id))
      .collect();

    const processTypes = await Promise.all(
      links.map(async (link) => {
        const pt = await ctx.db.get(link.processTypeId);
        return pt ? { ...pt, _id: link.processTypeId } : null;
      })
    );

    return {
      ...legalFramework,
      processTypes: processTypes.filter((pt) => pt !== null),
    };
  },
});

/**
 * Query to get process types for a legal framework
 */
export const getProcessTypes = query({
  args: { legalFrameworkId: v.id("legalFrameworks") },
  handler: async (ctx, { legalFrameworkId }) => {
    const links = await ctx.db
      .query("processTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", legalFrameworkId))
      .collect();

    const processTypes = await Promise.all(
      links.map(async (link) => {
        const pt = await ctx.db.get(link.processTypeId);
        return pt ? { ...pt, _id: link.processTypeId } : null;
      })
    );

    return processTypes.filter((pt) => pt !== null);
  },
});

/**
 * Mutation to create legal framework (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    processTypeIds: v.optional(v.array(v.id("processTypes"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const legalFrameworkId = await ctx.db.insert("legalFrameworks", {
      name: args.name,
      description: args.description ?? "",
      isActive: args.isActive ?? true,
    });

    // Create junction table records for process types
    if (args.processTypeIds && args.processTypeIds.length > 0 && userProfile.userId) {
      for (const processTypeId of args.processTypeIds) {
        await ctx.db.insert("processTypesLegalFrameworks", {
          processTypeId,
          legalFrameworkId,
          createdAt: Date.now(),
          createdBy: userProfile.userId,
        });
      }
    }

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
    description: v.optional(v.string()),
    processTypeIds: v.optional(v.array(v.id("processTypes"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const updates: any = {
      name: args.name,
    };

    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(id, updates);

    // Update junction table records for process types
    if (args.processTypeIds !== undefined && userProfile.userId) {
      // Delete all existing links
      const existingLinks = await ctx.db
        .query("processTypesLegalFrameworks")
        .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", id))
        .collect();

      for (const link of existingLinks) {
        await ctx.db.delete(link._id);
      }

      // Create new links
      if (args.processTypeIds.length > 0) {
        for (const processTypeId of args.processTypeIds) {
          await ctx.db.insert("processTypesLegalFrameworks", {
            processTypeId,
            legalFrameworkId: id,
            createdAt: Date.now(),
            createdBy: userProfile.userId,
          });
        }
      }
    }

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

    // Delete all junction table records first
    const existingLinks = await ctx.db
      .query("processTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", id))
      .collect();

    for (const link of existingLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete the legal framework
    await ctx.db.delete(id);
  },
});
