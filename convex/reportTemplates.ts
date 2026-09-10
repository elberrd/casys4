import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAdmin, requireActiveUserProfile } from "./lib/auth";
import { buildChangedFields, logActivitySafely } from "./lib/activityLogger";
import { normalizeString } from "./lib/stringUtils";
import { reportTemplateMatchesProcessLegalFramework } from "../lib/report-templates/legal-framework-match";
import type { Id } from "./_generated/dataModel";

const documentTypeSummaryValidator = v.object({
  _id: v.id("documentTypes"),
  name: v.string(),
});

const legalFrameworkSummaryValidator = v.union(
  v.object({
    _id: v.id("legalFrameworks"),
    name: v.string(),
  }),
  v.null(),
);

const authorizationTypeSummaryValidator = v.object({
  _id: v.id("processTypes"),
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
  legalFramework: legalFrameworkSummaryValidator,
  authorizationTypes: v.array(authorizationTypeSummaryValidator),
  documentTypes: v.array(documentTypeSummaryValidator),
});

const reportTemplateDetailValidator = v.object({
  _id: v.id("reportTemplates"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  contentHtml: v.string(),
  isActive: v.boolean(),
  legalFrameworkId: v.optional(v.id("legalFrameworks")),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
  legalFramework: legalFrameworkSummaryValidator,
  authorizationTypes: v.array(authorizationTypeSummaryValidator),
  documentTypes: v.array(documentTypeSummaryValidator),
});

const reportTemplateSummaryValidator = v.object({
  _id: v.id("reportTemplates"),
  name: v.string(),
  legalFrameworkId: v.optional(v.id("legalFrameworks")),
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

async function resolveLegalFrameworkId(
  ctx: QueryCtx | MutationCtx,
  legalFrameworkId: Id<"legalFrameworks"> | undefined,
): Promise<Id<"legalFrameworks"> | undefined> {
  if (!legalFrameworkId) return undefined;
  const legalFramework = await ctx.db.get(legalFrameworkId);
  if (!legalFramework) {
    throw new Error("Legal framework not found");
  }
  return legalFrameworkId;
}

async function getLegalFrameworkDisplay(
  ctx: QueryCtx | MutationCtx,
  legalFrameworkId: Id<"legalFrameworks"> | undefined,
): Promise<{
  legalFramework: { _id: Id<"legalFrameworks">; name: string } | null;
  authorizationTypes: Array<{ _id: Id<"processTypes">; name: string }>;
}> {
  if (!legalFrameworkId) {
    return { legalFramework: null, authorizationTypes: [] };
  }

  const legalFramework = await ctx.db.get(legalFrameworkId);
  if (!legalFramework) {
    return { legalFramework: null, authorizationTypes: [] };
  }

  const links = await ctx.db
    .query("processTypesLegalFrameworks")
    .withIndex("by_legalFramework", (q) =>
      q.eq("legalFrameworkId", legalFrameworkId),
    )
    .collect();

  const authorizationTypes: Array<{ _id: Id<"processTypes">; name: string }> = [];
  for (const link of links) {
    const processType = await ctx.db.get(link.processTypeId);
    if (processType) {
      authorizationTypes.push({ _id: processType._id, name: processType.name });
    }
  }
  authorizationTypes.sort((a, b) => a.name.localeCompare(b.name, "pt"));

  return {
    legalFramework: { _id: legalFramework._id, name: legalFramework.name },
    authorizationTypes,
  };
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
      const { legalFramework, authorizationTypes } =
        await getLegalFrameworkDisplay(ctx, template.legalFrameworkId);
      items.push({
        _id: template._id,
        _creationTime: template._creationTime,
        name: template.name,
        description: template.description,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        legalFramework,
        authorizationTypes,
        documentTypes: await getLinkedDocumentTypes(ctx, template._id),
      });
    }
    return items;
  },
});

export const listActiveSummaries = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  returns: v.array(reportTemplateSummaryValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const process = await ctx.db.get(args.individualProcessId);
    if (!process || process.requestStatus === "draft") {
      return [];
    }

    const templates = await ctx.db
      .query("reportTemplates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const available = templates.filter((template) =>
      reportTemplateMatchesProcessLegalFramework(
        template.legalFrameworkId,
        process.legalFrameworkId,
      ),
    );

    available.sort((a, b) => a.name.localeCompare(b.name, "pt"));

    const items = [];
    for (const template of available) {
      const documentTypes = await getLinkedDocumentTypes(ctx, template._id);
      items.push({
        _id: template._id,
        name: template.name,
        legalFrameworkId: template.legalFrameworkId,
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

    const { legalFramework, authorizationTypes } =
      await getLegalFrameworkDisplay(ctx, template.legalFrameworkId);

    return {
      ...template,
      legalFramework,
      authorizationTypes,
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
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
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
    const legalFrameworkId = await resolveLegalFrameworkId(
      ctx,
      args.legalFrameworkId,
    );

    const now = Date.now();
    const templateId = await ctx.db.insert("reportTemplates", {
      name,
      description: args.description?.trim() || undefined,
      contentHtml: args.contentHtml,
      isActive: args.isActive,
      ...(legalFrameworkId ? { legalFrameworkId } : {}),
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
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
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
    const legalFrameworkId = await resolveLegalFrameworkId(
      ctx,
      args.legalFrameworkId,
    );

    const next = {
      name,
      description: args.description?.trim() || undefined,
      contentHtml: args.contentHtml,
      isActive: args.isActive,
      legalFrameworkId,
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
            legalFrameworkId: template.legalFrameworkId,
          },
          {
            name: next.name,
            description: next.description,
            isActive: next.isActive,
            legalFrameworkId: next.legalFrameworkId,
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
