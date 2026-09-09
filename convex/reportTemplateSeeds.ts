import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  CRIMINAL_BACKGROUND_REPORT_DESCRIPTION,
  CRIMINAL_BACKGROUND_REPORT_HTML,
  CRIMINAL_BACKGROUND_REPORT_NAME,
} from "../lib/report-templates/built-in-templates";

/**
 * Inserts or refreshes built-in report templates (admin-authored HTML).
 * Safe to re-run: updates content of the known criminal-background declaration.
 *
 * pnpm exec convex run --prod internal.reportTemplateSeeds.upsertBuiltInTemplates
 */
export const upsertBuiltInTemplates = internalMutation({
  args: {},
  returns: v.object({
    action: v.union(v.literal("inserted"), v.literal("updated")),
    id: v.id("reportTemplates"),
    name: v.string(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const name = CRIMINAL_BACKGROUND_REPORT_NAME;
    const existing = await ctx.db
      .query("reportTemplates")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        description: CRIMINAL_BACKGROUND_REPORT_DESCRIPTION,
        contentHtml: CRIMINAL_BACKGROUND_REPORT_HTML,
        isActive: true,
        updatedAt: now,
      });
      return { action: "updated" as const, id: existing._id, name };
    }

    const admins = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();
    const owner = admins.find(
      (profile) => profile.isActive && profile.userId,
    );
    if (!owner?.userId) {
      throw new Error(
        "No active admin user found to own built-in report templates",
      );
    }

    const createdBy = owner.userId;
    const id = await ctx.db.insert("reportTemplates", {
      name,
      description: CRIMINAL_BACKGROUND_REPORT_DESCRIPTION,
      contentHtml: CRIMINAL_BACKGROUND_REPORT_HTML,
      isActive: true,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return { action: "inserted" as const, id, name };
  },
});
