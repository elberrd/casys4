import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

export const list = query({
  args: {
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let documentTypes = await ctx.db.query("documentTypes").collect();

    if (args.category !== undefined) {
      documentTypes = documentTypes.filter((dt) => dt.category === args.category);
    }

    if (args.isActive !== undefined) {
      documentTypes = documentTypes.filter((dt) => dt.isActive === args.isActive);
    }

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      documentTypes = documentTypes.filter((item) => {
        const name = normalizeString(item.name);
        const description = item.description ? normalizeString(item.description) : "";
        const category = item.category ? normalizeString(item.category) : "";

        return (
          name.includes(searchNormalized) ||
          description.includes(searchNormalized) ||
          category.includes(searchNormalized)
        );
      });
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
    code: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    // Check for duplicate code if provided
    if (args.code) {
      const existing = await ctx.db
        .query("documentTypes")
        .withIndex("by_code", (q) => q.eq("code", args.code!))
        .first();

      if (existing) {
        throw new Error("A document type with this code already exists");
      }
    }

    const documentTypeId = await ctx.db.insert("documentTypes", {
      name: args.name,
      code: args.code ? args.code.toUpperCase().replace(/\s+/g, "") : "",
      category: args.category ?? "",
      description: args.description ?? "",
      isActive: args.isActive ?? true,
    });

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "documentTypes",
        entityId: documentTypeId,
        details: {
          name: args.name,
          code: args.code,
          category: args.category,
        },
      });
    }

    return documentTypeId;
  },
});

/**
 * Mutation to update a document type (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("documentTypes"),
    name: v.string(),
    code: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const { id, ...updateData } = args;

    // Check for duplicate code (excluding current record) if provided
    if (args.code) {
      const existing = await ctx.db
        .query("documentTypes")
        .withIndex("by_code", (q) => q.eq("code", args.code!))
        .first();

      if (existing && existing._id !== id) {
        throw new Error("A document type with this code already exists");
      }
    }

    await ctx.db.patch(id, {
      name: updateData.name,
      ...(updateData.code !== undefined && {
        code: updateData.code.toUpperCase().replace(/\s+/g, "")
      }),
      ...(updateData.category !== undefined && { category: updateData.category }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
    });

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "updated",
        entityType: "documentTypes",
        entityId: id,
        details: {
          name: updateData.name,
          code: updateData.code,
          category: updateData.category,
        },
      });
    }
  },
});

/**
 * Mutation to delete a document type (admin only)
 */
export const remove = mutation({
  args: { id: v.id("documentTypes") },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    // Get document type data before deletion for logging
    const documentType = await ctx.db.get(args.id);
    if (!documentType) {
      throw new Error("Document type not found");
    }

    // TODO: Add cascade check when document requirements table is implemented
    // Check if any document requirements reference this document type
    await ctx.db.delete(args.id);

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "documentTypes",
        entityId: args.id,
        details: {
          name: documentType.name,
          code: documentType.code,
        },
      });
    }
  },
});
