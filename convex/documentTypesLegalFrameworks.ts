import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, getCurrentUserProfile } from "./lib/auth";

/**
 * Query to list all associations for a specific document type
 */
export const listByDocumentType = query({
  args: {
    documentTypeId: v.id("documentTypes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("documentTypesLegalFrameworks"),
      documentTypeId: v.id("documentTypes"),
      legalFrameworkId: v.id("legalFrameworks"),
      legalFrameworkName: v.string(),
      isRequired: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const associations = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    const enrichedAssociations = await Promise.all(
      associations.map(async (assoc) => {
        const legalFramework = await ctx.db.get(assoc.legalFrameworkId);
        return {
          _id: assoc._id,
          documentTypeId: assoc.documentTypeId,
          legalFrameworkId: assoc.legalFrameworkId,
          legalFrameworkName: legalFramework?.name ?? "",
          isRequired: assoc.isRequired,
          createdAt: assoc.createdAt,
        };
      })
    );

    return enrichedAssociations;
  },
});

/**
 * Query to list all document types for a specific legal framework
 */
export const listByLegalFramework = query({
  args: {
    legalFrameworkId: v.id("legalFrameworks"),
  },
  returns: v.array(
    v.object({
      _id: v.id("documentTypesLegalFrameworks"),
      documentTypeId: v.id("documentTypes"),
      documentTypeName: v.string(),
      documentTypeCode: v.optional(v.string()),
      documentTypeCategory: v.optional(v.string()),
      documentTypeDescription: v.optional(v.string()),
      allowedFileTypes: v.optional(v.array(v.string())),
      maxFileSizeMB: v.optional(v.number()),
      legalFrameworkId: v.id("legalFrameworks"),
      isRequired: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const associations = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) =>
        q.eq("legalFrameworkId", args.legalFrameworkId)
      )
      .collect();

    const enrichedAssociations = await Promise.all(
      associations.map(async (assoc) => {
        const documentType = await ctx.db.get(assoc.documentTypeId);
        // Only return active document types
        if (!documentType || documentType.isActive === false) {
          return null;
        }
        return {
          _id: assoc._id,
          documentTypeId: assoc.documentTypeId,
          documentTypeName: documentType.name,
          documentTypeCode: documentType.code,
          documentTypeCategory: documentType.category,
          documentTypeDescription: documentType.description,
          allowedFileTypes: documentType.allowedFileTypes,
          maxFileSizeMB: documentType.maxFileSizeMB,
          legalFrameworkId: assoc.legalFrameworkId,
          isRequired: assoc.isRequired,
          createdAt: assoc.createdAt,
        };
      })
    );

    return enrichedAssociations.filter(
      (assoc): assoc is NonNullable<typeof assoc> => assoc !== null
    );
  },
});

/**
 * Mutation to update all associations for a document type
 * Deletes existing associations and creates new ones
 */
export const updateAssociations = mutation({
  args: {
    documentTypeId: v.id("documentTypes"),
    associations: v.array(
      v.object({
        legalFrameworkId: v.id("legalFrameworks"),
        isRequired: v.boolean(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    // Delete existing associations for this document type
    const existingAssociations = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    for (const assoc of existingAssociations) {
      await ctx.db.delete(assoc._id);
    }

    // Create new associations
    const now = Date.now();
    for (const assoc of args.associations) {
      await ctx.db.insert("documentTypesLegalFrameworks", {
        documentTypeId: args.documentTypeId,
        legalFrameworkId: assoc.legalFrameworkId,
        isRequired: assoc.isRequired,
        createdAt: now,
        createdBy: userProfile.userId,
      });
    }

    return null;
  },
});

/**
 * Mutation to toggle all legal frameworks for a document type
 * selectAll: true - creates associations for all active legal frameworks
 * selectAll: false - removes all associations
 */
export const toggleAllForDocumentType = mutation({
  args: {
    documentTypeId: v.id("documentTypes"),
    selectAll: v.boolean(),
    defaultIsRequired: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    // Delete existing associations
    const existingAssociations = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    for (const assoc of existingAssociations) {
      await ctx.db.delete(assoc._id);
    }

    // If selectAll is true, create associations for all active legal frameworks
    if (args.selectAll) {
      const legalFrameworks = await ctx.db
        .query("legalFrameworks")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();

      const now = Date.now();
      for (const lf of legalFrameworks) {
        await ctx.db.insert("documentTypesLegalFrameworks", {
          documentTypeId: args.documentTypeId,
          legalFrameworkId: lf._id,
          isRequired: args.defaultIsRequired ?? false,
          createdAt: now,
          createdBy: userProfile.userId,
        });
      }
    }

    return null;
  },
});

/**
 * Mutation to update isRequired for a single association
 */
export const updateIsRequired = mutation({
  args: {
    documentTypeId: v.id("documentTypes"),
    legalFrameworkId: v.id("legalFrameworks"),
    isRequired: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const association = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_documentType_legalFramework", (q) =>
        q
          .eq("documentTypeId", args.documentTypeId)
          .eq("legalFrameworkId", args.legalFrameworkId)
      )
      .first();

    if (!association) {
      throw new Error("Association not found");
    }

    await ctx.db.patch(association._id, {
      isRequired: args.isRequired,
    });

    return null;
  },
});
