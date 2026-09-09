import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { buildChangedFields, logActivitySafely } from "./lib/activityLogger";
import {
  buildCboCodeDocument,
  mergeCboCodeDocument,
} from "./lib/cboCodeDocument";
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
    activity: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("cboCodes"),
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);
    const document = buildCboCodeDocument(args);

    if (document.code) {
      const existing = await ctx.db
        .query("cboCodes")
        .withIndex("by_code", (q) => q.eq("code", document.code))
        .first();

      if (existing) {
        throw new Error("A CBO code with this code already exists");
      }
    }

    const cboCodeId = await ctx.db.insert("cboCodes", document);

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "created",
      entityType: "cboCode",
      entityId: cboCodeId,
      details: {
        code: document.code ?? null,
        title: document.title,
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
    activity: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);

    const current = await ctx.db.get(args.id);
    if (!current) {
      throw new Error("CBO code not found");
    }

    const next = mergeCboCodeDocument(current, args);

    if (next.code) {
      const duplicate = await ctx.db
        .query("cboCodes")
        .withIndex("by_code", (q) => q.eq("code", next.code))
        .first();

      if (duplicate && duplicate._id !== args.id) {
        throw new Error("A CBO code with this code already exists");
      }
    }

    // Replace with schema fields only. Patching leftover extra fields on
    // older CBO documents fails Convex schema validation with a generic
    // "Server Error" on the client.
    await ctx.db.replace(args.id, next);

    const changes = buildChangedFields(
      {
        code: current.code ?? null,
        title: current.title,
        activity: current.activity ?? null,
        description: current.description ?? null,
      },
      {
        code: next.code ?? null,
        title: next.title,
        activity: next.activity ?? null,
        description: next.description ?? null,
      }
    );

    if (Object.keys(changes).length > 0) {
      await logActivitySafely(ctx, {
        userId: adminProfile.userId,
        action: "updated",
        entityType: "cboCode",
        entityId: args.id,
        details: {
          title: current.title,
          changes,
        },
      });
    }

    return null;
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
