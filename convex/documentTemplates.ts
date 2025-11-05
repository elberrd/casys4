import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";

/**
 * Query to list all document templates with optional filters
 * Access control: Admins have full access, clients have read-only access
 */
export const list = query({
  args: {
    processTypeId: v.optional(v.id("processTypes")),
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    let results;

    // Apply filters
    if (args.processTypeId !== undefined) {
      const processTypeId = args.processTypeId;
      results = await ctx.db
        .query("documentTemplates")
        .withIndex("by_processType", (q) => q.eq("processTypeId", processTypeId))
        .collect();
    } else if (args.legalFrameworkId !== undefined) {
      const legalFrameworkId = args.legalFrameworkId;
      results = await ctx.db
        .query("documentTemplates")
        .withIndex("by_legalFramework", (q) =>
          q.eq("legalFrameworkId", legalFrameworkId),
        )
        .collect();
    } else if (args.isActive !== undefined) {
      const isActive = args.isActive;
      results = await ctx.db
        .query("documentTemplates")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
    } else {
      results = await ctx.db.query("documentTemplates").collect();
    }

    // Additional filtering
    if (args.isActive !== undefined) {
      results = results.filter((r) => r.isActive === args.isActive);
    }
    if (args.processTypeId !== undefined) {
      results = results.filter((r) => r.processTypeId === args.processTypeId);
    }
    if (args.legalFrameworkId !== undefined) {
      results = results.filter(
        (r) => r.legalFrameworkId === args.legalFrameworkId,
      );
    }

    // Enrich with related data
    const enrichedResults = await Promise.all(
      results.map(async (template) => {
        const [processType, legalFramework, creator] = await Promise.all([
          ctx.db.get(template.processTypeId),
          template.legalFrameworkId
            ? ctx.db.get(template.legalFrameworkId)
            : null,
          ctx.db.get(template.createdBy),
        ]);

        // Get creator profile
        let creatorProfile = null;
        if (creator) {
          creatorProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", creator._id))
            .first();
        }

        // Count document requirements
        const requirements = await ctx.db
          .query("documentRequirements")
          .withIndex("by_template", (q) => q.eq("templateId", template._id))
          .collect();

        return {
          ...template,
          processType,
          legalFramework,
          creatorProfile,
          requirementsCount: requirements.length,
        };
      }),
    );

    return enrichedResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Query to get a single document template by ID with all requirements
 * Access control: All authenticated users can view templates
 */
export const get = query({
  args: { id: v.id("documentTemplates") },
  handler: async (ctx, { id }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const template = await ctx.db.get(id);
    if (!template) return null;

    const [processType, legalFramework, creator] = await Promise.all([
      ctx.db.get(template.processTypeId),
      template.legalFrameworkId
        ? ctx.db.get(template.legalFrameworkId)
        : null,
      ctx.db.get(template.createdBy),
    ]);

    // Get creator profile
    let creatorProfile = null;
    if (creator) {
      creatorProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", creator._id))
        .first();
    }

    // Get all document requirements sorted by sortOrder
    const requirements = await ctx.db
      .query("documentRequirements")
      .withIndex("by_template", (q) => q.eq("templateId", template._id))
      .collect();

    // Enrich requirements with document type data
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
    enrichedRequirements.sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      ...template,
      processType,
      legalFramework,
      creatorProfile,
      requirements: enrichedRequirements,
    };
  },
});

/**
 * Mutation to create a new document template (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    processTypeId: v.id("processTypes"),
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    // Ensure user has userId (pre-registered users cannot create templates)
    if (!userProfile.userId) {
      throw new Error("User profile must be activated before creating templates");
    }

    const now = Date.now();

    // Get the highest version number for templates with the same processType
    const existingTemplates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_processType", (q) =>
        q.eq("processTypeId", args.processTypeId),
      )
      .collect();

    // Filter by legalFramework if provided
    const matchingTemplates = args.legalFrameworkId
      ? existingTemplates.filter(
          (t) => t.legalFrameworkId === args.legalFrameworkId,
        )
      : existingTemplates.filter((t) => !t.legalFrameworkId);

    const maxVersion = matchingTemplates.reduce(
      (max, t) => Math.max(max, t.version),
      0,
    );

    const templateId = await ctx.db.insert("documentTemplates", {
      name: args.name,
      description: args.description,
      processTypeId: args.processTypeId,
      legalFrameworkId: args.legalFrameworkId,
      isActive: args.isActive,
      version: maxVersion + 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userProfile.userId!, // Safe: checked above
    });

    return templateId;
  },
});

/**
 * Mutation to update document template (admin only)
 * Note: Cannot change processType or legalFramework - create new version instead
 */
export const update = mutation({
  args: {
    id: v.id("documentTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    await requireAdmin(ctx);

    const template = await ctx.db.get(id);
    if (!template) {
      throw new Error("Document template not found");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Only update provided fields
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(id, updates);

    return id;
  },
});

/**
 * Mutation to delete document template (admin only)
 * Prevents deletion if template is in use
 */
export const remove = mutation({
  args: { id: v.id("documentTemplates") },
  handler: async (ctx, { id }) => {
    // Require admin role
    await requireAdmin(ctx);

    // Check if template is being used by any individual processes
    // We need to check if any documentsDelivered reference this template's requirements
    const requirements = await ctx.db
      .query("documentRequirements")
      .withIndex("by_template", (q) => q.eq("templateId", id))
      .collect();

    if (requirements.length > 0) {
      // Check if any of these requirements are referenced in documentsDelivered
      for (const requirement of requirements) {
        const documents = await ctx.db
          .query("documentsDelivered")
          .withIndex("by_requirement", (q) =>
            q.eq("documentRequirementId", requirement._id),
          )
          .first();

        if (documents) {
          throw new Error(
            "Cannot delete template that is in use. Please deactivate it instead.",
          );
        }
      }
    }

    // Cascade delete all requirements first
    for (const requirement of requirements) {
      await ctx.db.delete(requirement._id);
    }

    await ctx.db.delete(id);
  },
});

/**
 * Mutation to clone a template for versioning (admin only)
 * Creates a new version of the template with all requirements copied
 */
export const clone = mutation({
  args: { id: v.id("documentTemplates") },
  handler: async (ctx, { id }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    // Ensure user has userId (pre-registered users cannot clone templates)
    if (!userProfile.userId) {
      throw new Error("User profile must be activated before cloning templates");
    }

    const template = await ctx.db.get(id);
    if (!template) {
      throw new Error("Document template not found");
    }

    const now = Date.now();

    // Get all templates with the same processType and legalFramework
    const existingTemplates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_processType", (q) =>
        q.eq("processTypeId", template.processTypeId),
      )
      .collect();

    const matchingTemplates = template.legalFrameworkId
      ? existingTemplates.filter(
          (t) => t.legalFrameworkId === template.legalFrameworkId,
        )
      : existingTemplates.filter((t) => !t.legalFrameworkId);

    const maxVersion = matchingTemplates.reduce(
      (max, t) => Math.max(max, t.version),
      0,
    );

    // Create new template
    const newTemplateId = await ctx.db.insert("documentTemplates", {
      name: `${template.name} (v${maxVersion + 1})`,
      description: template.description,
      processTypeId: template.processTypeId,
      legalFrameworkId: template.legalFrameworkId,
      isActive: false, // Start as inactive until reviewed
      version: maxVersion + 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userProfile.userId!, // Safe: checked above
    });

    // Get all requirements from the original template
    const requirements = await ctx.db
      .query("documentRequirements")
      .withIndex("by_template", (q) => q.eq("templateId", id))
      .collect();

    // Copy all requirements to the new template
    for (const req of requirements) {
      await ctx.db.insert("documentRequirements", {
        templateId: newTemplateId,
        documentTypeId: req.documentTypeId,
        isRequired: req.isRequired,
        isCritical: req.isCritical,
        description: req.description,
        exampleUrl: req.exampleUrl,
        maxSizeMB: req.maxSizeMB,
        allowedFormats: req.allowedFormats,
        sortOrder: req.sortOrder,
        validityDays: req.validityDays,
        requiresTranslation: req.requiresTranslation,
        requiresNotarization: req.requiresNotarization,
      });
    }

    return newTemplateId;
  },
});
