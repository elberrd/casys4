import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to list all global document type conditions with optional filtering
 * Conditions are now global and can be linked to multiple document types
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let conditions = await ctx.db.query("documentTypeConditions").collect();

    if (args.isActive !== undefined) {
      conditions = conditions.filter((c) => c.isActive === args.isActive);
    }

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      conditions = conditions.filter((item) => {
        const name = normalizeString(item.name);
        const description = item.description
          ? normalizeString(item.description)
          : "";
        const code = item.code ? normalizeString(item.code) : "";

        return (
          name.includes(searchNormalized) ||
          description.includes(searchNormalized) ||
          code.includes(searchNormalized)
        );
      });
    }

    // Sort by sortOrder, then by name
    return conditions.sort((a, b) => {
      const orderA = a.sortOrder ?? 999;
      const orderB = b.sortOrder ?? 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });
  },
});

/**
 * Query to list conditions linked to a specific document type
 * Uses the documentTypeConditionLinks junction table
 */
export const listByDocumentType = query({
  args: { documentTypeId: v.id("documentTypes") },
  handler: async (ctx, args) => {
    // Get all links for this document type
    const links = await ctx.db
      .query("documentTypeConditionLinks")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    // Fetch the condition data for each link
    const conditionsWithLinks = await Promise.all(
      links.map(async (link) => {
        const condition = await ctx.db.get(link.documentTypeConditionId);
        if (!condition) return null;

        return {
          ...condition,
          // Override with link-specific values
          isRequired: link.isRequired,
          sortOrder: link.sortOrder ?? condition.sortOrder,
          linkId: link._id,
          linkCreatedAt: link.createdAt,
        };
      })
    );

    // Filter out null values and sort
    return conditionsWithLinks
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => {
        const orderA = a.sortOrder ?? 999;
        const orderB = b.sortOrder ?? 999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      });
  },
});

/**
 * Query to list active conditions linked to a specific document type
 */
export const listActiveByDocumentType = query({
  args: { documentTypeId: v.id("documentTypes") },
  handler: async (ctx, args) => {
    // Get all links for this document type
    const links = await ctx.db
      .query("documentTypeConditionLinks")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    // Fetch the condition data for each link
    const conditionsWithLinks = await Promise.all(
      links.map(async (link) => {
        const condition = await ctx.db.get(link.documentTypeConditionId);
        if (!condition || !condition.isActive) return null;

        return {
          ...condition,
          // Override with link-specific values
          isRequired: link.isRequired,
          sortOrder: link.sortOrder ?? condition.sortOrder,
          linkId: link._id,
          linkCreatedAt: link.createdAt,
        };
      })
    );

    // Filter out null values and sort
    return conditionsWithLinks
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => {
        const orderA = a.sortOrder ?? 999;
        const orderB = b.sortOrder ?? 999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      });
  },
});

/**
 * Query to list conditions NOT yet linked to a specific document type
 * Useful for the combobox when adding new conditions to a document type
 */
export const listAvailableForDocumentType = query({
  args: { documentTypeId: v.id("documentTypes") },
  handler: async (ctx, args) => {
    // Get all links for this document type
    const links = await ctx.db
      .query("documentTypeConditionLinks")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    const linkedConditionIds = new Set(
      links.map((link) => link.documentTypeConditionId)
    );

    // Get all active conditions
    const allConditions = await ctx.db
      .query("documentTypeConditions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter out already linked conditions
    const availableConditions = allConditions.filter(
      (condition) => !linkedConditionIds.has(condition._id)
    );

    // Sort by name
    return availableConditions.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Query to get a single condition by ID
 */
export const get = query({
  args: { id: v.id("documentTypeConditions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Mutation to create a new global document type condition (admin only)
 * The condition will need to be linked to document types separately
 */
export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isRequired: v.boolean(),
    relativeExpirationDays: v.optional(v.number()),
    isActive: v.boolean(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    // Generate code from name if not provided
    const code = args.code
      ? args.code.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")
      : args.name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");

    // Check for duplicate code globally
    if (code) {
      const existingCondition = await ctx.db
        .query("documentTypeConditions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();

      if (existingCondition) {
        throw new Error("A condition with this code already exists");
      }
    }

    const now = Date.now();

    const conditionId = await ctx.db.insert("documentTypeConditions", {
      name: args.name,
      code: code || undefined,
      description: args.description || undefined,
      isRequired: args.isRequired,
      relativeExpirationDays: args.relativeExpirationDays,
      isActive: args.isActive,
      sortOrder: args.sortOrder,
      createdAt: now,
      createdBy: userProfile.userId,
    });

    return conditionId;
  },
});

/**
 * Mutation to create a new condition and immediately link it to a document type
 * Useful for the "create new" flow in the conditions section
 */
export const createAndLink = mutation({
  args: {
    documentTypeId: v.id("documentTypes"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isRequired: v.boolean(),
    relativeExpirationDays: v.optional(v.number()),
    isActive: v.boolean(),
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

    // Generate code from name if not provided
    const code = args.code
      ? args.code.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")
      : args.name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");

    // Check for duplicate code globally
    if (code) {
      const existingCondition = await ctx.db
        .query("documentTypeConditions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();

      if (existingCondition) {
        throw new Error("A condition with this code already exists");
      }
    }

    const now = Date.now();

    // Create the condition
    const conditionId = await ctx.db.insert("documentTypeConditions", {
      name: args.name,
      code: code || undefined,
      description: args.description || undefined,
      isRequired: args.isRequired,
      relativeExpirationDays: args.relativeExpirationDays,
      isActive: args.isActive,
      sortOrder: args.sortOrder,
      createdAt: now,
      createdBy: userProfile.userId,
    });

    // Create the link to the document type
    await ctx.db.insert("documentTypeConditionLinks", {
      documentTypeId: args.documentTypeId,
      documentTypeConditionId: conditionId,
      isRequired: args.isRequired,
      sortOrder: args.sortOrder,
      createdAt: now,
      createdBy: userProfile.userId,
    });

    return conditionId;
  },
});

/**
 * Mutation to update a document type condition (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("documentTypeConditions"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isRequired: v.boolean(),
    relativeExpirationDays: v.optional(v.number()),
    isActive: v.boolean(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Condition not found");
    }

    // Generate code from name if not provided
    const code = args.code
      ? args.code.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")
      : args.name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");

    // Check for duplicate code globally (excluding current record)
    if (code) {
      const existingCondition = await ctx.db
        .query("documentTypeConditions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();

      if (existingCondition && existingCondition._id !== args.id) {
        throw new Error("A condition with this code already exists");
      }
    }

    const now = Date.now();

    await ctx.db.patch(args.id, {
      name: args.name,
      code: code || undefined,
      description: args.description || undefined,
      isRequired: args.isRequired,
      relativeExpirationDays: args.relativeExpirationDays,
      isActive: args.isActive,
      sortOrder: args.sortOrder,
      updatedAt: now,
      updatedBy: userProfile.userId,
    });

    return args.id;
  },
});

/**
 * Mutation to delete a document type condition (admin only)
 * Will also delete all links to document types
 */
export const remove = mutation({
  args: { id: v.id("documentTypeConditions") },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // Check if any documentDeliveredConditions reference this condition
    const usedConditions = await ctx.db
      .query("documentDeliveredConditions")
      .withIndex("by_condition", (q) => q.eq("documentTypeConditionId", args.id))
      .first();

    if (usedConditions) {
      throw new Error(
        "Cannot delete: this condition is being used by delivered documents"
      );
    }

    // Delete all links to this condition
    const links = await ctx.db
      .query("documentTypeConditionLinks")
      .withIndex("by_condition", (q) => q.eq("documentTypeConditionId", args.id))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete the condition
    await ctx.db.delete(args.id);
  },
});
