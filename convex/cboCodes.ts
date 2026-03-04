import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { buildChangedFields, logActivitySafely } from "./lib/activityLogger";
import { normalizeString } from "./lib/stringUtils";

export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let cboCodes = await ctx.db.query("cboCodes").collect();

    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      cboCodes = cboCodes.filter(
        (cbo) =>
          (cbo.code && normalizeString(cbo.code).includes(searchNormalized)) ||
          normalizeString(cbo.title).includes(searchNormalized) ||
          (cbo.description && normalizeString(cbo.description).includes(searchNormalized))
      );
    }

    return cboCodes;
  },
});

export const get = query({
  args: { id: v.id("cboCodes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const cboCodes = await ctx.db.query("cboCodes").collect();
    const searchNormalized = normalizeString(args.query);

    return cboCodes
      .filter(
        (cbo) =>
          (cbo.code && normalizeString(cbo.code).includes(searchNormalized)) ||
          normalizeString(cbo.title).includes(searchNormalized)
      )
      .slice(0, 10); // Return max 10 results for typeahead
  },
});

/**
 * Mutation to create CBO code (admin only)
 */
export const create = mutation({
  args: {
    code: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);

    // Check for duplicate code only if code is provided
    if (args.code) {
      const existing = await ctx.db
        .query("cboCodes")
        .withIndex("by_code", (q) => q.eq("code", args.code))
        .first();

      if (existing) {
        throw new Error("A CBO code with this code already exists");
      }
    }

    const cboCodeId = await ctx.db.insert("cboCodes", {
      code: args.code,
      title: args.title,
      description: args.description,
    });

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "created",
      entityType: "cboCode",
      entityId: cboCodeId,
      details: {
        code: args.code,
        title: args.title,
      },
    });

    return cboCodeId;
  },
});

/**
 * Mutation to update CBO code (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("cboCodes"),
    code: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);

    const { id, ...updateData } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("CBO code not found");
    }

    // Check for duplicate code (excluding current record) only if code is provided
    if (args.code) {
      const existing = await ctx.db
        .query("cboCodes")
        .withIndex("by_code", (q) => q.eq("code", args.code))
        .first();

      if (existing && existing._id !== id) {
        throw new Error("A CBO code with this code already exists");
      }
    }

    await ctx.db.patch(id, updateData);

    const changes = buildChangedFields(
      {
        code: existing.code,
        title: existing.title,
        description: existing.description,
      },
      {
        code: updateData.code,
        title: updateData.title,
        description: updateData.description,
      }
    );

    if (Object.keys(changes).length > 0) {
      await logActivitySafely(ctx, {
        userId: adminProfile.userId,
        action: "updated",
        entityType: "cboCode",
        entityId: id,
        details: {
          title: existing.title,
          changes,
        },
      });
    }
  },
});

/**
 * Mutation to delete CBO code (admin only)
 */
export const remove = mutation({
  args: { id: v.id("cboCodes") },
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("CBO code not found");
    }

    // TODO: Add cascade check when individual processes table is implemented
    // Check if any individual processes reference this CBO code
    await ctx.db.delete(args.id);

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "deleted",
      entityType: "cboCode",
      entityId: args.id,
      details: {
        code: existing.code,
        title: existing.title,
      },
    });
  },
});
