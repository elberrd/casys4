import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAdmin, requireActiveUserProfile } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

const savedEditValidator = v.object({
  _id: v.id("processReportEdits"),
  contentHtml: v.string(),
  filename: v.string(),
  updatedAt: v.number(),
});

async function assertEditableProcess(
  ctx: QueryCtx | MutationCtx,
  individualProcessId: Id<"individualProcesses">,
) {
  const process = await ctx.db.get(individualProcessId);
  if (!process || process.requestStatus === "draft") {
    throw new Error("Individual process not found");
  }
  return process;
}

export const getByProcessAndTemplate = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
    reportTemplateId: v.id("reportTemplates"),
  },
  returns: v.union(savedEditValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const process = await ctx.db.get(args.individualProcessId);
    if (!process || process.requestStatus === "draft") {
      return null;
    }

    const template = await ctx.db.get(args.reportTemplateId);
    if (!template) {
      return null;
    }

    const saved = await ctx.db
      .query("processReportEdits")
      .withIndex("by_individualProcess_and_reportTemplate", (q) =>
        q
          .eq("individualProcessId", args.individualProcessId)
          .eq("reportTemplateId", args.reportTemplateId),
      )
      .unique();

    if (!saved) return null;

    return {
      _id: saved._id,
      contentHtml: saved.contentHtml,
      filename: saved.filename,
      updatedAt: saved.updatedAt,
    };
  },
});

export const save = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    reportTemplateId: v.id("reportTemplates"),
    contentHtml: v.string(),
    filename: v.string(),
  },
  returns: v.id("processReportEdits"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const profile = await requireActiveUserProfile(ctx);
    await assertEditableProcess(ctx, args.individualProcessId);

    const template = await ctx.db.get(args.reportTemplateId);
    if (!template) {
      throw new Error("Report template not found");
    }

    const existing = await ctx.db
      .query("processReportEdits")
      .withIndex("by_individualProcess_and_reportTemplate", (q) =>
        q
          .eq("individualProcessId", args.individualProcessId)
          .eq("reportTemplateId", args.reportTemplateId),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        contentHtml: args.contentHtml,
        filename: args.filename,
        updatedAt: now,
        updatedBy: profile.userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("processReportEdits", {
      individualProcessId: args.individualProcessId,
      reportTemplateId: args.reportTemplateId,
      contentHtml: args.contentHtml,
      filename: args.filename,
      updatedAt: now,
      updatedBy: profile.userId,
    });
  },
});

export const clear = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    reportTemplateId: v.id("reportTemplates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await assertEditableProcess(ctx, args.individualProcessId);

    const existing = await ctx.db
      .query("processReportEdits")
      .withIndex("by_individualProcess_and_reportTemplate", (q) =>
        q
          .eq("individualProcessId", args.individualProcessId)
          .eq("reportTemplateId", args.reportTemplateId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});
