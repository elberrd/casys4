import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  CRIMINAL_BACKGROUND_REPORT_DESCRIPTION,
  CRIMINAL_BACKGROUND_REPORT_HTML,
  CRIMINAL_BACKGROUND_REPORT_NAME,
  PROFESSIONAL_EXPERIENCE_REPORT_DESCRIPTION,
  PROFESSIONAL_EXPERIENCE_REPORT_HTML,
  PROFESSIONAL_EXPERIENCE_REPORT_NAME,
} from "../lib/report-templates/built-in-templates";

const builtInTemplates = [
  {
    name: CRIMINAL_BACKGROUND_REPORT_NAME,
    description: CRIMINAL_BACKGROUND_REPORT_DESCRIPTION,
    contentHtml: CRIMINAL_BACKGROUND_REPORT_HTML,
  },
  {
    name: PROFESSIONAL_EXPERIENCE_REPORT_NAME,
    description: PROFESSIONAL_EXPERIENCE_REPORT_DESCRIPTION,
    contentHtml: PROFESSIONAL_EXPERIENCE_REPORT_HTML,
  },
] as const;

/**
 * Inserts or refreshes built-in report templates (admin-authored HTML).
 * Safe to re-run: updates content of known declarations by name.
 *
 * pnpm exec convex run internal.reportTemplateSeeds.upsertBuiltInTemplates
 * pnpm exec convex run --prod internal.reportTemplateSeeds.upsertBuiltInTemplates
 */
export const upsertBuiltInTemplates = internalMutation({
  args: {},
  returns: v.array(
    v.object({
      action: v.union(v.literal("inserted"), v.literal("updated")),
      id: v.id("reportTemplates"),
      name: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const now = Date.now();
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

    const results: Array<{
      action: "inserted" | "updated";
      id: Id<"reportTemplates">;
      name: string;
    }> = [];

    for (const template of builtInTemplates) {
      const existing = await ctx.db
        .query("reportTemplates")
        .withIndex("by_name", (q) => q.eq("name", template.name))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          description: template.description,
          contentHtml: template.contentHtml,
          isActive: true,
          updatedAt: now,
        });
        results.push({
          action: "updated",
          id: existing._id,
          name: template.name,
        });
        continue;
      }

      const id = await ctx.db.insert("reportTemplates", {
        name: template.name,
        description: template.description,
        contentHtml: template.contentHtml,
        isActive: true,
        createdBy: owner.userId,
        createdAt: now,
        updatedAt: now,
      });
      results.push({ action: "inserted", id, name: template.name });
    }

    return results;
  },
});
