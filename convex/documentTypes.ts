import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin, getCurrentUserProfile } from "./lib/auth";
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
 * Query to get a document type with all its legal framework associations
 */
export const getWithLegalFrameworks = query({
  args: { id: v.id("documentTypes") },
  handler: async (ctx, args) => {
    const documentType = await ctx.db.get(args.id);
    if (!documentType) {
      return null;
    }

    // Get all associations for this document type
    const associations = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_documentType", (q) => q.eq("documentTypeId", args.id))
      .collect();

    // Enrich associations with legal framework data
    const enrichedAssociations = await Promise.all(
      associations.map(async (assoc) => {
        const legalFramework = await ctx.db.get(assoc.legalFrameworkId);
        return {
          legalFrameworkId: assoc.legalFrameworkId,
          legalFrameworkName: legalFramework?.name ?? "",
          isRequired: assoc.isRequired,
        };
      })
    );

    return {
      ...documentType,
      legalFrameworkAssociations: enrichedAssociations,
    };
  },
});

/**
 * Query to list document types associated with a specific legal framework
 */
export const listByLegalFramework = query({
  args: { legalFrameworkId: v.id("legalFrameworks") },
  handler: async (ctx, args) => {
    const associations = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) =>
        q.eq("legalFrameworkId", args.legalFrameworkId)
      )
      .collect();

    const documentTypes = await Promise.all(
      associations.map(async (assoc) => {
        const documentType = await ctx.db.get(assoc.documentTypeId);
        if (!documentType || documentType.isActive === false) {
          return null;
        }
        return {
          ...documentType,
          isRequired: assoc.isRequired,
        };
      })
    );

    return documentTypes.filter(
      (dt): dt is NonNullable<typeof dt> => dt !== null
    );
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
    allowedFileTypes: v.optional(v.array(v.string())),
    maxFileSizeMB: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    legalFrameworkAssociations: v.optional(
      v.array(
        v.object({
          legalFrameworkId: v.id("legalFrameworks"),
          isRequired: v.boolean(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

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
      allowedFileTypes: args.allowedFileTypes ?? [],
      maxFileSizeMB: args.maxFileSizeMB ?? 10,
      isActive: args.isActive ?? true,
    });

    // Create legal framework associations if provided
    if (args.legalFrameworkAssociations && args.legalFrameworkAssociations.length > 0) {
      const now = Date.now();
      for (const assoc of args.legalFrameworkAssociations) {
        await ctx.db.insert("documentTypesLegalFrameworks", {
          documentTypeId,
          legalFrameworkId: assoc.legalFrameworkId,
          isRequired: assoc.isRequired,
          createdAt: now,
          createdBy: userProfile.userId,
        });
      }
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
    allowedFileTypes: v.optional(v.array(v.string())),
    maxFileSizeMB: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    legalFrameworkAssociations: v.optional(
      v.array(
        v.object({
          legalFrameworkId: v.id("legalFrameworks"),
          isRequired: v.boolean(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    const { id, legalFrameworkAssociations, ...updateData } = args;

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
        code: updateData.code.toUpperCase().replace(/\s+/g, ""),
      }),
      ...(updateData.category !== undefined && { category: updateData.category }),
      ...(updateData.description !== undefined && {
        description: updateData.description,
      }),
      ...(updateData.allowedFileTypes !== undefined && {
        allowedFileTypes: updateData.allowedFileTypes,
      }),
      ...(updateData.maxFileSizeMB !== undefined && {
        maxFileSizeMB: updateData.maxFileSizeMB,
      }),
      ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
    });

    // Update legal framework associations if provided
    if (legalFrameworkAssociations !== undefined) {
      // Delete existing associations
      const existingAssociations = await ctx.db
        .query("documentTypesLegalFrameworks")
        .withIndex("by_documentType", (q) => q.eq("documentTypeId", id))
        .collect();

      for (const assoc of existingAssociations) {
        await ctx.db.delete(assoc._id);
      }

      // Create new associations
      const now = Date.now();
      for (const assoc of legalFrameworkAssociations) {
        await ctx.db.insert("documentTypesLegalFrameworks", {
          documentTypeId: id,
          legalFrameworkId: assoc.legalFrameworkId,
          isRequired: assoc.isRequired,
          createdAt: now,
          createdBy: userProfile.userId,
        });
      }
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
    await requireAdmin(ctx);

    // TODO: Add cascade check when document requirements table is implemented
    // Check if any document requirements reference this document type
    await ctx.db.delete(args.id);
  },
});
