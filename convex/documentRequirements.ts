import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

/**
 * Query to list document requirements by template ID
 * Sorted by sortOrder
 */
export const list = query({
  args: {
    templateId: v.id("documentTemplates"),
  },
  handler: async (ctx, { templateId }) => {
    const requirements = await ctx.db
      .query("documentRequirements")
      .withIndex("by_template", (q) => q.eq("templateId", templateId))
      .collect();

    // Enrich with document type data
    const enrichedRequirements = await Promise.all(
      requirements.map(async (req) => {
        const documentType = await ctx.db.get(req.documentTypeId);
        return {
          ...req,
          documentType,
        };
      }),
    );

    // Sort by sortOrder
    return enrichedRequirements.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Mutation to create a new document requirement (admin only)
 */
export const create = mutation({
  args: {
    templateId: v.id("documentTemplates"),
    documentTypeId: v.id("documentTypes"),
    isRequired: v.boolean(),
    isCritical: v.boolean(),
    description: v.string(),
    exampleUrl: v.optional(v.string()),
    maxSizeMB: v.number(),
    allowedFormats: v.array(v.string()),
    validityDays: v.optional(v.number()),
    requiresTranslation: v.boolean(),
    requiresNotarization: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // Verify template exists
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Document template not found");
    }

    // Get existing requirements to determine next sortOrder
    const existingRequirements = await ctx.db
      .query("documentRequirements")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    const maxSortOrder = existingRequirements.reduce(
      (max, req) => Math.max(max, req.sortOrder),
      0,
    );

    const requirementId = await ctx.db.insert("documentRequirements", {
      templateId: args.templateId,
      documentTypeId: args.documentTypeId,
      isRequired: args.isRequired,
      isCritical: args.isCritical,
      description: args.description,
      exampleUrl: args.exampleUrl,
      maxSizeMB: args.maxSizeMB,
      allowedFormats: args.allowedFormats,
      sortOrder: maxSortOrder + 1,
      validityDays: args.validityDays,
      requiresTranslation: args.requiresTranslation,
      requiresNotarization: args.requiresNotarization,
    });

    return requirementId;
  },
});

/**
 * Mutation to update a document requirement (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("documentRequirements"),
    documentTypeId: v.optional(v.id("documentTypes")),
    isRequired: v.optional(v.boolean()),
    isCritical: v.optional(v.boolean()),
    description: v.optional(v.string()),
    exampleUrl: v.optional(v.string()),
    maxSizeMB: v.optional(v.number()),
    allowedFormats: v.optional(v.array(v.string())),
    validityDays: v.optional(v.number()),
    requiresTranslation: v.optional(v.boolean()),
    requiresNotarization: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    await requireAdmin(ctx);

    const requirement = await ctx.db.get(id);
    if (!requirement) {
      throw new Error("Document requirement not found");
    }

    const updates: any = {};

    // Only update provided fields
    if (args.documentTypeId !== undefined)
      updates.documentTypeId = args.documentTypeId;
    if (args.isRequired !== undefined) updates.isRequired = args.isRequired;
    if (args.isCritical !== undefined) updates.isCritical = args.isCritical;
    if (args.description !== undefined) updates.description = args.description;
    if (args.exampleUrl !== undefined) updates.exampleUrl = args.exampleUrl;
    if (args.maxSizeMB !== undefined) updates.maxSizeMB = args.maxSizeMB;
    if (args.allowedFormats !== undefined)
      updates.allowedFormats = args.allowedFormats;
    if (args.validityDays !== undefined) updates.validityDays = args.validityDays;
    if (args.requiresTranslation !== undefined)
      updates.requiresTranslation = args.requiresTranslation;
    if (args.requiresNotarization !== undefined)
      updates.requiresNotarization = args.requiresNotarization;

    await ctx.db.patch(id, updates);

    return id;
  },
});

/**
 * Mutation to reorder document requirements (admin only)
 * Updates sortOrder for multiple requirements at once
 */
export const reorder = mutation({
  args: {
    requirements: v.array(
      v.object({
        id: v.id("documentRequirements"),
        sortOrder: v.number(),
      }),
    ),
  },
  handler: async (ctx, { requirements }) => {
    // Require admin role
    await requireAdmin(ctx);

    // Check for duplicate sortOrder values
    const sortOrders = requirements.map((r) => r.sortOrder);
    const uniqueSortOrders = new Set(sortOrders);
    if (sortOrders.length !== uniqueSortOrders.size) {
      throw new Error("Duplicate sortOrder values are not allowed");
    }

    // Update all requirements
    for (const req of requirements) {
      await ctx.db.patch(req.id, { sortOrder: req.sortOrder });
    }

    return requirements.map((r) => r.id);
  },
});

/**
 * Mutation to delete a document requirement (admin only)
 * Prevents deletion if requirement has any documents delivered
 */
export const remove = mutation({
  args: { id: v.id("documentRequirements") },
  handler: async (ctx, { id }) => {
    // Require admin role
    await requireAdmin(ctx);

    // Check if requirement has any documents delivered
    const documents = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_requirement", (q) => q.eq("documentRequirementId", id))
      .first();

    if (documents) {
      throw new Error(
        "Cannot delete requirement that has documents delivered. Please remove or reassign the documents first.",
      );
    }

    await ctx.db.delete(id);
  },
});
