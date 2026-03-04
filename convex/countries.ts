import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { buildChangedFields, logActivitySafely } from "./lib/activityLogger";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to list all countries with optional accent-insensitive search
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let countries = await ctx.db.query("countries").collect();

    // Filter by search query if provided (accent-insensitive)
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      countries = countries.filter((country) =>
        normalizeString(country.name).includes(searchNormalized)
      );
    }

    return countries;
  },
});

/**
 * Query to get country by ID
 */
export const get = query({
  args: { id: v.id("countries") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Mutation to create country (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    flag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);

    const countryId = await ctx.db.insert("countries", {
      name: args.name,
      code: "",
      iso3: "",
      flag: args.flag,
    });

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "created",
      entityType: "country",
      entityId: countryId,
      details: {
        name: args.name,
        flag: args.flag,
      },
    });

    return countryId;
  },
});

/**
 * Mutation to update country (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("countries"),
    name: v.string(),
    flag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Country not found");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      flag: args.flag,
    });

    const changes = buildChangedFields(
      {
        name: existing.name,
        flag: existing.flag,
      },
      {
        name: args.name,
        flag: args.flag,
      }
    );

    if (Object.keys(changes).length > 0) {
      await logActivitySafely(ctx, {
        userId: adminProfile.userId,
        action: "updated",
        entityType: "country",
        entityId: args.id,
        details: {
          name: existing.name,
          changes,
        },
      });
    }

    return args.id;
  },
});

/**
 * Mutation to delete country (admin only)
 */
export const remove = mutation({
  args: { id: v.id("countries") },
  handler: async (ctx, { id }) => {
    const adminProfile = await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Country not found");
    }

    // Check if there are states associated with this country
    const states = await ctx.db
      .query("states")
      .withIndex("by_country", (q) => q.eq("countryId", id))
      .first();

    if (states) {
      throw new Error("Cannot delete country with associated states");
    }

    await ctx.db.delete(id);

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "deleted",
      entityType: "country",
      entityId: id,
      details: {
        name: existing.name,
        code: existing.code,
        iso3: existing.iso3,
      },
    });
  },
});
