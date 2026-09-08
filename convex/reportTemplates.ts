import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAdmin, requireActiveUserProfile } from "./lib/auth";
import { buildChangedFields, logActivitySafely } from "./lib/activityLogger";
import { normalizeString } from "./lib/stringUtils";
import type { Id } from "./_generated/dataModel";

const documentTypeSummaryValidator = v.object({
  _id: v.id("documentTypes"),
  name: v.string(),
});

const reportTemplateListItemValidator = v.object({
  _id: v.id("reportTemplates"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  documentTypes: v.array(documentTypeSummaryValidator),
});

const reportTemplateDetailValidator = v.object({
  _id: v.id("reportTemplates"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  contentHtml: v.string(),
  isActive: v.boolean(),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
  documentTypes: v.array(documentTypeSummaryValidator),
});

const reportTemplateSummaryValidator = v.object({
  _id: v.id("reportTemplates"),
  name: v.string(),
  documentTypeIds: v.array(v.id("documentTypes")),
});

async function getLinkedDocumentTypes(
  ctx: QueryCtx | MutationCtx,
  reportTemplateId: Id<"reportTemplates">,
) {
  const links = await ctx.db
    .query("reportTemplateDocumentTypes")
    .withIndex("by_reportTemplate", (q) =>
      q.eq("reportTemplateId", reportTemplateId),
    )
    .collect();

  const documentTypes: Array<{ _id: Id<"documentTypes">; name: string }> = [];
  for (const link of links) {
    const documentType = await ctx.db.get(link.documentTypeId);
    if (documentType) {
      documentTypes.push({ _id: documentType._id, name: documentType.name });
    }
  }

  documentTypes.sort((a, b) => a.name.localeCompare(b.name, "pt"));
  return documentTypes;
}

async function assertUniqueName(
  ctx: QueryCtx | MutationCtx,
  name: string,
  excludeId?: Id<"reportTemplates">,
) {
  const trimmed = name.trim();
  const existing = await ctx.db
    .query("reportTemplates")
    .withIndex("by_name", (q) => q.eq("name", trimmed))
    .first();

  if (existing && existing._id !== excludeId) {
    throw new Error("A report template with this name already exists");
  }

  if (!existing) {
    const all = await ctx.db.query("reportTemplates").collect();
    const normalized = normalizeString(trimmed);
    const duplicate = all.find(
      (template) =>
        template._id !== excludeId &&
        normalizeString(template.name) === normalized,
    );
    if (duplicate) {
      throw new Error("A report template with this name already exists");
    }
  }
}

async function replaceDocumentTypeLinks(
  ctx: MutationCtx,
  reportTemplateId: Id<"reportTemplates">,
  documentTypeIds: Id<"documentTypes">[],
) {
  const existing = await ctx.db
    .query("reportTemplateDocumentTypes")
    .withIndex("by_reportTemplate", (q) =>
      q.eq("reportTemplateId", reportTemplateId),
    )
    .collect();

  for (const link of existing) {
    await ctx.db.delete(link._id);
  }

  const uniqueIds = [...new Set(documentTypeIds)];
  const now = Date.now();
  for (const documentTypeId of uniqueIds) {
    const documentType = await ctx.db.get(documentTypeId);
    if (!documentType) {
      throw new Error("Document type not found");
    }
    await ctx.db.insert("reportTemplateDocumentTypes", {
      reportTemplateId,
      documentTypeId,
      createdAt: now,
    });
  }
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.array(reportTemplateListItemValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let templates;
    if (args.isActive === undefined) {
      templates = await ctx.db.query("reportTemplates").collect();
    } else {
      const isActive = args.isActive;
      templates = await ctx.db
        .query("reportTemplates")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
    }

    const searchNormalized = args.search
      ? normalizeString(args.search)
      : "";

    const filtered = searchNormalized
      ? templates.filter((template) => {
          const name = normalizeString(template.name);
          const description = template.description
            ? normalizeString(template.description)
            : "";
          return (
            name.includes(searchNormalized) ||
            description.includes(searchNormalized)
          );
        })
      : templates;

    filtered.sort((a, b) => a.name.localeCompare(b.name, "pt"));

    const items = [];
    for (const template of filtered) {
      items.push({
        _id: template._id,
        _creationTime: template._creationTime,
        name: template.name,
        description: template.description,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        documentTypes: await getLinkedDocumentTypes(ctx, template._id),
      });
    }
    return items;
  },
});

export const listActiveSummaries = query({
  args: {},
  returns: v.array(reportTemplateSummaryValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const templates = await ctx.db
      .query("reportTemplates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    templates.sort((a, b) => a.name.localeCompare(b.name, "pt"));

    const items = [];
    for (const template of templates) {
      const documentTypes = await getLinkedDocumentTypes(ctx, template._id);
      items.push({
        _id: template._id,
        name: template.name,
        documentTypeIds: documentTypes.map((documentType) => documentType._id),
      });
    }
    return items;
  },
});

export const get = query({
  args: { id: v.id("reportTemplates") },
  returns: v.union(reportTemplateDetailValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const template = await ctx.db.get(args.id);
    if (!template) return null;

    return {
      ...template,
      documentTypes: await getLinkedDocumentTypes(ctx, template._id),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    contentHtml: v.string(),
    isActive: v.boolean(),
    documentTypeIds: v.array(v.id("documentTypes")),
  },
  returns: v.id("reportTemplates"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const profile = await requireActiveUserProfile(ctx);
    if (!profile.userId) {
      throw new Error("User profile must be activated");
    }
    const name = args.name.trim();
    if (!name) {
      throw new Error("Report template name is required");
    }

    await assertUniqueName(ctx, name);

    const now = Date.now();
    const templateId = await ctx.db.insert("reportTemplates", {
      name,
      description: args.description?.trim() || undefined,
      contentHtml: args.contentHtml,
      isActive: args.isActive,
      createdBy: profile.userId,
      createdAt: now,
      updatedAt: now,
    });

    await replaceDocumentTypeLinks(ctx, templateId, args.documentTypeIds);

    await logActivitySafely(ctx, {
      userId: admin.userId,
      action: "create",
      entityType: "reportTemplate",
      entityId: templateId,
      details: { name },
    });

    return templateId;
  },
});

export const update = mutation({
  args: {
    id: v.id("reportTemplates"),
    name: v.string(),
    description: v.optional(v.string()),
    contentHtml: v.string(),
    isActive: v.boolean(),
    documentTypeIds: v.array(v.id("documentTypes")),
  },
  returns: v.id("reportTemplates"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error("Report template not found");
    }

    const name = args.name.trim();
    if (!name) {
      throw new Error("Report template name is required");
    }

    await assertUniqueName(ctx, name, args.id);

    const next = {
      name,
      description: args.description?.trim() || undefined,
      contentHtml: args.contentHtml,
      isActive: args.isActive,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.id, next);
    await replaceDocumentTypeLinks(ctx, args.id, args.documentTypeIds);

    await logActivitySafely(ctx, {
      userId: admin.userId,
      action: "update",
      entityType: "reportTemplate",
      entityId: args.id,
      details: {
        changedFields: buildChangedFields(
          {
            name: template.name,
            description: template.description,
            isActive: template.isActive,
          },
          {
            name: next.name,
            description: next.description,
            isActive: next.isActive,
          },
        ),
      },
    });

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("reportTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error("Report template not found");
    }

    const links = await ctx.db
      .query("reportTemplateDocumentTypes")
      .withIndex("by_reportTemplate", (q) => q.eq("reportTemplateId", args.id))
      .collect();
    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.id);

    await logActivitySafely(ctx, {
      userId: admin.userId,
      action: "delete",
      entityType: "reportTemplate",
      entityId: args.id,
      details: { name: template.name },
    });

    return null;
  },
});
