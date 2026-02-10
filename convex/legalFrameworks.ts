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

    // Get authorization types for each legal framework
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

    // Get authorization types for this legal framework
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

    // Get document type associations for this legal framework
    const docTypeLinks = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", id))
      .collect();

    const documentTypeAssociations = await Promise.all(
      docTypeLinks.map(async (link) => {
        const dt = await ctx.db.get(link.documentTypeId);
        return {
          documentTypeId: link.documentTypeId,
          documentTypeName: dt?.name ?? "",
          documentTypeCode: dt?.code,
          isRequired: link.isRequired,
          validityType: link.validityType,
          validityDays: link.validityDays,
        };
      })
    );

    return {
      ...legalFramework,
      processTypes: processTypes.filter((pt) => pt !== null),
      documentTypeAssociations: documentTypeAssociations.filter(
        (a) => a.documentTypeName !== ""
      ),
    };
  },
});

/**
 * Query to get authorization types for a legal framework
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
 * Query to get legal frameworks filtered by processTypeId
 * Returns only active legal frameworks linked to the specified authorization type
 */
export const listByProcessType = query({
  args: { processTypeId: v.id("processTypes") },
  handler: async (ctx, { processTypeId }) => {
    // Get all junction table records for this process type
    const links = await ctx.db
      .query("processTypesLegalFrameworks")
      .withIndex("by_processType", (q) => q.eq("processTypeId", processTypeId))
      .collect();

    // Get all legal frameworks for these links (only active ones)
    const legalFrameworks = await Promise.all(
      links.map(async (link) => {
        const lf = await ctx.db.get(link.legalFrameworkId);
        return lf && lf.isActive ? lf : null;
      })
    );

    return legalFrameworks.filter((lf) => lf !== null);
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
    documentTypeAssociations: v.optional(
      v.array(
        v.object({
          documentTypeId: v.id("documentTypes"),
          isRequired: v.boolean(),
          validityType: v.optional(v.string()),
          validityDays: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Require admin role and active user (with valid userId)
    const adminProfile = await requireAdmin(ctx);

    // Ensure userId exists if we need to create junction table records
    const hasProcessTypes = args.processTypeIds && args.processTypeIds.length > 0;
    const hasDocTypes = args.documentTypeAssociations && args.documentTypeAssociations.length > 0;
    if ((hasProcessTypes || hasDocTypes) && !adminProfile.userId) {
      throw new Error("User profile not activated. Please contact an administrator to complete your account setup.");
    }

    const legalFrameworkId = await ctx.db.insert("legalFrameworks", {
      name: args.name,
      description: args.description ?? "",
      isActive: args.isActive ?? true,
    });

    const now = Date.now();

    // Create junction table records for authorization types
    if (args.processTypeIds && args.processTypeIds.length > 0) {
      for (const processTypeId of args.processTypeIds) {
        await ctx.db.insert("processTypesLegalFrameworks", {
          processTypeId,
          legalFrameworkId,
          createdAt: now,
          createdBy: adminProfile.userId!,
        });
      }
    }

    // Create junction table records for document types
    if (args.documentTypeAssociations && args.documentTypeAssociations.length > 0) {
      for (const assoc of args.documentTypeAssociations) {
        await ctx.db.insert("documentTypesLegalFrameworks", {
          documentTypeId: assoc.documentTypeId,
          legalFrameworkId,
          isRequired: assoc.isRequired,
          validityType: assoc.validityType,
          validityDays: assoc.validityDays,
          createdAt: now,
          createdBy: adminProfile.userId!,
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
    documentTypeAssociations: v.optional(
      v.array(
        v.object({
          documentTypeId: v.id("documentTypes"),
          isRequired: v.boolean(),
          validityType: v.optional(v.string()),
          validityDays: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

    // Ensure userId exists if we need to update junction table records
    const hasProcessTypes = args.processTypeIds !== undefined && args.processTypeIds.length > 0;
    const hasDocTypes = args.documentTypeAssociations !== undefined && args.documentTypeAssociations.length > 0;
    if ((hasProcessTypes || hasDocTypes) && !adminProfile.userId) {
      throw new Error("User profile not activated. Please contact an administrator to complete your account setup.");
    }

    const updates: Record<string, string | boolean> = {
      name: args.name,
    };

    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(id, updates);

    const now = Date.now();

    // Update junction table records for authorization types
    if (args.processTypeIds !== undefined) {
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
            createdAt: now,
            createdBy: adminProfile.userId!,
          });
        }
      }
    }

    // Update junction table records for document types
    if (args.documentTypeAssociations !== undefined) {
      // Delete all existing links
      const existingDocLinks = await ctx.db
        .query("documentTypesLegalFrameworks")
        .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", id))
        .collect();

      for (const link of existingDocLinks) {
        await ctx.db.delete(link._id);
      }

      // Create new links
      if (args.documentTypeAssociations.length > 0) {
        for (const assoc of args.documentTypeAssociations) {
          await ctx.db.insert("documentTypesLegalFrameworks", {
            documentTypeId: assoc.documentTypeId,
            legalFrameworkId: id,
            isRequired: assoc.isRequired,
            validityType: assoc.validityType,
            validityDays: assoc.validityDays,
            createdAt: now,
            createdBy: adminProfile.userId!,
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

    // Delete all process types junction table records
    const existingProcessTypeLinks = await ctx.db
      .query("processTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", id))
      .collect();

    for (const link of existingProcessTypeLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete all document types junction table records
    const existingDocTypeLinks = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) => q.eq("legalFrameworkId", id))
      .collect();

    for (const link of existingDocTypeLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete the legal framework
    await ctx.db.delete(id);
  },
});
