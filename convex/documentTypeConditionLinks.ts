import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Query to list all links for a specific document type
 * Returns the link data along with the condition details
 */
export const listByDocumentType = query({
  args: { documentTypeId: v.id("documentTypes") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("documentTypeConditionLinks")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    // Enrich with condition data
    const enrichedLinks = await Promise.all(
      links.map(async (link) => {
        const condition = await ctx.db.get(link.documentTypeConditionId);
        return {
          ...link,
          condition: condition
            ? {
                _id: condition._id,
                name: condition.name,
                code: condition.code,
                description: condition.description,
                relativeExpirationDays: condition.relativeExpirationDays,
                isActive: condition.isActive,
              }
            : null,
        };
      })
    );

    return enrichedLinks.filter((link) => link.condition !== null);
  },
});

/**
 * Query to check if a condition is already linked to a document type
 */
export const isLinked = query({
  args: {
    documentTypeId: v.id("documentTypes"),
    documentTypeConditionId: v.id("documentTypeConditions"),
  },
  handler: async (ctx, args) => {
    const existingLink = await ctx.db
      .query("documentTypeConditionLinks")
      .withIndex("by_documentType_condition", (q) =>
        q
          .eq("documentTypeId", args.documentTypeId)
          .eq("documentTypeConditionId", args.documentTypeConditionId)
      )
      .first();

    return existingLink !== null;
  },
});

/**
 * Mutation to link a condition to a document type (admin only)
 */
export const link = mutation({
  args: {
    documentTypeId: v.id("documentTypes"),
    documentTypeConditionId: v.id("documentTypeConditions"),
    isRequired: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    // Verify document type exists
    const documentType = await ctx.db.get(args.documentTypeId);
    if (!documentType) {
      throw new Error("Document type not found");
    }

    // Verify condition exists
    const condition = await ctx.db.get(args.documentTypeConditionId);
    if (!condition) {
      throw new Error("Condition not found");
    }

    // Check if link already exists
    const existingLink = await ctx.db
      .query("documentTypeConditionLinks")
      .withIndex("by_documentType_condition", (q) =>
        q
          .eq("documentTypeId", args.documentTypeId)
          .eq("documentTypeConditionId", args.documentTypeConditionId)
      )
      .first();

    if (existingLink) {
      throw new Error("This condition is already linked to this document type");
    }

    const now = Date.now();

    // Use condition's default isRequired if not specified
    const isRequired = args.isRequired ?? condition.isRequired;

    const linkId = await ctx.db.insert("documentTypeConditionLinks", {
      documentTypeId: args.documentTypeId,
      documentTypeConditionId: args.documentTypeConditionId,
      isRequired,
      sortOrder: args.sortOrder,
      createdAt: now,
      createdBy: userProfile.userId,
    });

    return linkId;
  },
});

/**
 * Mutation to unlink a condition from a document type (admin only)
 */
export const unlink = mutation({
  args: {
    documentTypeId: v.id("documentTypes"),
    documentTypeConditionId: v.id("documentTypeConditions"),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // Find the link
    const link = await ctx.db
      .query("documentTypeConditionLinks")
      .withIndex("by_documentType_condition", (q) =>
        q
          .eq("documentTypeId", args.documentTypeId)
          .eq("documentTypeConditionId", args.documentTypeConditionId)
      )
      .first();

    if (!link) {
      throw new Error("Link not found");
    }

    await ctx.db.delete(link._id);
  },
});

/**
 * Mutation to unlink by link ID (admin only)
 */
export const unlinkById = mutation({
  args: {
    linkId: v.id("documentTypeConditionLinks"),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    await ctx.db.delete(args.linkId);
  },
});

/**
 * Mutation to update a link's properties (admin only)
 * Used to change isRequired or sortOrder for a specific document type
 */
export const updateLink = mutation({
  args: {
    linkId: v.id("documentTypeConditionLinks"),
    isRequired: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    const updates: { isRequired?: boolean; sortOrder?: number } = {};
    if (args.isRequired !== undefined) {
      updates.isRequired = args.isRequired;
    }
    if (args.sortOrder !== undefined) {
      updates.sortOrder = args.sortOrder;
    }

    await ctx.db.patch(args.linkId, updates);

    return args.linkId;
  },
});
