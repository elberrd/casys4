import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

/**
 * Query to list all field mappings for a specific document type
 */
export const list = query({
  args: {
    documentTypeId: v.id("documentTypes"),
  },
  handler: async (ctx, args) => {
    const mappings = await ctx.db
      .query("documentTypeFieldMappings")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    return mappings
      .filter((m) => m.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Query to list all field mappings for a specific document type (including inactive)
 */
export const listAll = query({
  args: {
    documentTypeId: v.id("documentTypes"),
  },
  handler: async (ctx, args) => {
    const mappings = await ctx.db
      .query("documentTypeFieldMappings")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    return mappings.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Query to find document types linked to a specific field
 * Used to show "attach document" option next to info fields
 */
export const listByField = query({
  args: {
    entityType: v.string(),
    fieldPath: v.string(),
  },
  handler: async (ctx, args) => {
    const mappings = await ctx.db
      .query("documentTypeFieldMappings")
      .withIndex("by_entityType_fieldPath", (q) =>
        q.eq("entityType", args.entityType).eq("fieldPath", args.fieldPath)
      )
      .collect();

    const activeMappings = mappings.filter((m) => m.isActive);

    // Enrich with document type info
    const enriched = await Promise.all(
      activeMappings.map(async (mapping) => {
        const documentType = await ctx.db.get(mapping.documentTypeId);
        return {
          ...mapping,
          documentTypeName: documentType?.name ?? "",
          documentTypeCode: documentType?.code,
        };
      })
    );

    return enriched;
  },
});

/**
 * Mutation to create a new field mapping
 */
export const create = mutation({
  args: {
    documentTypeId: v.id("documentTypes"),
    entityType: v.string(),
    fieldPath: v.string(),
    label: v.string(),
    labelEn: v.optional(v.string()),
    fieldType: v.optional(v.string()),
    isRequired: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    if (!userProfile.userId) {
      throw new Error("User must be activated");
    }

    const id = await ctx.db.insert("documentTypeFieldMappings", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
      createdBy: userProfile.userId,
    });

    return id;
  },
});

/**
 * Mutation to update a field mapping
 */
export const update = mutation({
  args: {
    id: v.id("documentTypeFieldMappings"),
    entityType: v.optional(v.string()),
    fieldPath: v.optional(v.string()),
    label: v.optional(v.string()),
    labelEn: v.optional(v.string()),
    fieldType: v.optional(v.string()),
    isRequired: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...data } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Field mapping not found");
    }

    // Only patch provided fields
    const updates: Record<string, any> = {};
    if (data.entityType !== undefined) updates.entityType = data.entityType;
    if (data.fieldPath !== undefined) updates.fieldPath = data.fieldPath;
    if (data.label !== undefined) updates.label = data.label;
    if (data.labelEn !== undefined) updates.labelEn = data.labelEn;
    if (data.fieldType !== undefined) updates.fieldType = data.fieldType;
    if (data.isRequired !== undefined) updates.isRequired = data.isRequired;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    await ctx.db.patch(id, updates);
    return id;
  },
});

/**
 * Mutation to remove a field mapping
 */
export const remove = mutation({
  args: {
    id: v.id("documentTypeFieldMappings"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/**
 * Query that builds a map of linked fields for an individual process.
 * Returns: Record<"entityType:fieldPath", { documentTypeName, documentTypeId }[]>
 * Used to show paperclip icons next to info fields in the process detail page.
 *
 * Collects document type IDs from two sources:
 * 1. Legal framework associations (documentTypesLegalFrameworks)
 * 2. Delivered documents that have a documentTypeId
 */
export const getLinkedFieldsMap = query({
  args: { individualProcessId: v.id("individualProcesses") },
  handler: async (ctx, args) => {
    const process = await ctx.db.get(args.individualProcessId);
    if (!process) return {};

    // Collect all relevant document type IDs from both sources
    const docTypeIds = new Set<Id<"documentTypes">>();

    // Source 1: Legal framework associations
    if (process.legalFrameworkId) {
      const docAssociations = await ctx.db
        .query("documentTypesLegalFrameworks")
        .withIndex("by_legalFramework", (q) =>
          q.eq("legalFrameworkId", process.legalFrameworkId!)
        )
        .collect();
      for (const assoc of docAssociations) {
        docTypeIds.add(assoc.documentTypeId);
      }
    }

    // Source 2: Delivered documents with a document type
    const deliveredDocs = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", args.individualProcessId)
      )
      .collect();
    for (const doc of deliveredDocs) {
      if (doc.documentTypeId) {
        docTypeIds.add(doc.documentTypeId);
      }
    }

    if (docTypeIds.size === 0) return {};

    // Build lookup: documentTypeId -> most recent delivered document ID
    const docTypeToDelivered = new Map<string, string>();
    for (const doc of deliveredDocs) {
      if (doc.documentTypeId) {
        // Keep the most recent (last in list) delivered doc per type
        docTypeToDelivered.set(doc.documentTypeId, doc._id);
      }
    }

    const map: Record<
      string,
      { documentTypeName: string; documentTypeId: string; deliveredDocumentId?: string }[]
    > = {};

    for (const docTypeId of docTypeIds) {
      const documentType = await ctx.db.get(docTypeId);
      if (!documentType || documentType.isActive === false) continue;

      const fieldMappings = await ctx.db
        .query("documentTypeFieldMappings")
        .withIndex("by_documentType", (q) =>
          q.eq("documentTypeId", docTypeId)
        )
        .collect();

      for (const mapping of fieldMappings) {
        if (!mapping.isActive) continue;
        const key = `${mapping.entityType}:${mapping.fieldPath}`;
        if (!map[key]) map[key] = [];
        // Avoid duplicates
        if (!map[key].some((l) => l.documentTypeId === documentType._id)) {
          map[key].push({
            documentTypeName: documentType.name,
            documentTypeId: documentType._id,
            deliveredDocumentId: docTypeToDelivered.get(documentType._id),
          });
        }
      }
    }

    return map;
  },
});

/**
 * Query that returns field mappings with current values for a document type + process.
 * Used in the document review dialog "Campos Vinculados" tab.
 */
export const getFieldsWithValues = query({
  args: {
    documentTypeId: v.id("documentTypes"),
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    const process = await ctx.db.get(args.individualProcessId);
    if (!process) return [];

    const person = await ctx.db.get(process.personId);
    if (!person) return [];

    const passport = process.passportId
      ? await ctx.db.get(process.passportId)
      : null;

    let company: any = null;
    if (process.companyApplicantId) {
      company = await ctx.db.get(process.companyApplicantId);
    } else if (process.collectiveProcessId) {
      const collective = await ctx.db.get(process.collectiveProcessId);
      if (collective?.companyId) {
        company = await ctx.db.get(collective.companyId);
      }
    }

    const fieldMappings = await ctx.db
      .query("documentTypeFieldMappings")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    const activeMappings = fieldMappings
      .filter((m) => m.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return activeMappings.map((mapping) => {
      const currentValue = getFieldValue(
        mapping.entityType,
        mapping.fieldPath,
        person,
        process,
        passport,
        company
      );

      return {
        entityType: mapping.entityType,
        fieldPath: mapping.fieldPath,
        label: mapping.label,
        labelEn: mapping.labelEn,
        fieldType: mapping.fieldType ?? "text",
        isRequired: mapping.isRequired,
        currentValue,
        isFilled:
          currentValue !== null &&
          currentValue !== undefined &&
          currentValue !== "",
      };
    });
  },
});

/**
 * Mutation to update field values from the document review "Campos" tab.
 * Groups changes by entity type and patches each entity.
 */
export const updateFieldValues = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    changes: v.array(
      v.object({
        entityType: v.string(),
        fieldPath: v.string(),
        value: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const process = await ctx.db.get(args.individualProcessId);
    if (!process) throw new Error("Individual process not found");

    // Group changes by entity type
    const grouped: Record<string, Record<string, any>> = {};
    for (const change of args.changes) {
      if (!grouped[change.entityType]) grouped[change.entityType] = {};
      grouped[change.entityType][change.fieldPath] = change.value;
    }

    // Apply patches per entity
    if (grouped.person) {
      await ctx.db.patch(process.personId, grouped.person);
    }

    if (grouped.individualProcess) {
      await ctx.db.patch(args.individualProcessId, grouped.individualProcess);
    }

    if (grouped.passport && process.passportId) {
      await ctx.db.patch(process.passportId, grouped.passport);
    }

    if (grouped.company) {
      let companyId = process.companyApplicantId;
      if (!companyId && process.collectiveProcessId) {
        const collective = await ctx.db.get(process.collectiveProcessId);
        companyId = collective?.companyId ?? undefined;
      }
      if (companyId) {
        await ctx.db.patch(companyId, grouped.company);
      }
    }
  },
});

/** Helper to extract a field value from the appropriate entity */
function getFieldValue(
  entityType: string,
  fieldPath: string,
  person: any,
  process: any,
  passport: any,
  company: any
): any {
  switch (entityType) {
    case "person":
      return person?.[fieldPath] ?? null;
    case "individualProcess":
      return process?.[fieldPath] ?? null;
    case "passport":
      return passport?.[fieldPath] ?? null;
    case "company":
      return company?.[fieldPath] ?? null;
    default:
      return null;
  }
}

/**
 * Mutation to reorder field mappings
 */
export const reorder = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.id("documentTypeFieldMappings"),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    for (const item of args.items) {
      await ctx.db.patch(item.id, { sortOrder: item.sortOrder });
    }
  },
});
