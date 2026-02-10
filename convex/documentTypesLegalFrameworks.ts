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
          responsibleParty: assoc.responsibleParty,
          workflowType: assoc.workflowType,
          validityDays: assoc.validityDays,
          validityType: assoc.validityType,
          sortOrder: assoc.sortOrder,
          description: assoc.description,
          notes: assoc.notes,
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
          responsibleParty: assoc.responsibleParty,
          workflowType: assoc.workflowType,
          validityDays: assoc.validityDays,
          validityType: assoc.validityType,
          sortOrder: assoc.sortOrder,
          description: assoc.description,
          notes: assoc.notes,
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
        responsibleParty: v.optional(v.string()),
        workflowType: v.optional(v.string()),
        validityDays: v.optional(v.number()),
        validityType: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        description: v.optional(v.string()),
        notes: v.optional(v.string()),
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
        responsibleParty: assoc.responsibleParty,
        workflowType: assoc.workflowType,
        validityDays: assoc.validityDays,
        validityType: assoc.validityType,
        sortOrder: assoc.sortOrder,
        description: assoc.description,
        notes: assoc.notes,
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

/**
 * Mutation to update metadata for a single association
 */
export const updateMetadata = mutation({
  args: {
    id: v.id("documentTypesLegalFrameworks"),
    responsibleParty: v.optional(v.string()),
    workflowType: v.optional(v.string()),
    validityDays: v.optional(v.number()),
    validityType: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...data } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Association not found");
    }

    const updates: Record<string, any> = {};
    if (data.responsibleParty !== undefined) updates.responsibleParty = data.responsibleParty;
    if (data.workflowType !== undefined) updates.workflowType = data.workflowType;
    if (data.validityDays !== undefined) updates.validityDays = data.validityDays;
    if (data.validityType !== undefined) updates.validityType = data.validityType;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.description !== undefined) updates.description = data.description;
    if (data.notes !== undefined) updates.notes = data.notes;

    await ctx.db.patch(id, updates);

    return null;
  },
});
