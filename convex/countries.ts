import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { buildChangedFields, logActivitySafely } from "./lib/activityLogger";
import {
  getCountryCodeCandidates,
  isCountryCodeLike,
} from "./lib/countryCodeNormalization";
import { normalizeString } from "./lib/stringUtils";
import { resolveOfficialCountryName } from "../lib/data/country-official-names-pt";

const countryDocValidator = v.object({
  _id: v.id("countries"),
  _creationTime: v.number(),
  name: v.string(),
  code: v.string(),
  iso3: v.string(),
  flag: v.optional(v.string()),
  fullName: v.optional(v.string()),
});

function resolvedFullName(args: {
  code?: string;
  name: string;
  fullName?: string;
}): string | undefined {
  const provided = args.fullName?.trim();
  if (provided) return provided;
  return resolveOfficialCountryName(args.code, args.name);
}

/**
 * Query to list all countries with optional accent-insensitive search
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  returns: v.array(countryDocValidator),
  handler: async (ctx, args) => {
    let countries = await ctx.db.query("countries").collect();

    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      countries = countries.filter((country) => {
        const nameMatch = normalizeString(country.name).includes(
          searchNormalized,
        );
        const fullNameMatch = country.fullName
          ? normalizeString(country.fullName).includes(searchNormalized)
          : false;
        return nameMatch || fullNameMatch;
      });
    }

    return countries;
  },
});

/**
 * Query to get country by ID
 */
export const get = query({
  args: { id: v.id("countries") },
  returns: v.union(countryDocValidator, v.null()),
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Resolve a country by ISO alpha-2 / alpha-3 code or (accent-insensitive) name.
 * Used to map passport OCR output (e.g. MRZ "BRA" or "Brazil") to a country ID.
 * Returns the matching country ID or null.
 */
export const findByCodeOrName = query({
  args: { value: v.string() },
  returns: v.union(v.id("countries"), v.null()),
  handler: async (ctx, { value }) => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const upper = trimmed.toUpperCase();
    const codeCandidates = getCountryCodeCandidates(trimmed);

    for (const code of codeCandidates) {
      const byCode = await ctx.db
        .query("countries")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (byCode) return byCode._id;
    }

    const byIso3 = await ctx.db
      .query("countries")
      .withIndex("by_iso3", (q) => q.eq("iso3", upper))
      .first();
    if (byIso3) return byIso3._id;

    // Never treat an unresolved code as a name fragment. For example, MRZ
    // code "NOR" is Norway; a partial-name search used to match North Korea.
    if (isCountryCodeLike(trimmed)) return null;

    const all = await ctx.db.query("countries").collect();
    const normalized = normalizeString(trimmed);
    const byExactName = all.find(
      (c) =>
        normalizeString(c.name) === normalized ||
        (c.fullName ? normalizeString(c.fullName) === normalized : false),
    );
    if (byExactName) return byExactName._id;

    const byPartialName = all.find((c) => {
      const cn = normalizeString(c.name);
      const fn = c.fullName ? normalizeString(c.fullName) : "";
      return (
        cn.includes(normalized) ||
        normalized.includes(cn) ||
        (fn.length > 0 && (fn.includes(normalized) || normalized.includes(fn)))
      );
    });
    return byPartialName?._id ?? null;
  },
});

/**
 * Mutation to create country (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    flag: v.optional(v.string()),
    fullName: v.optional(v.string()),
  },
  returns: v.id("countries"),
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);
    const fullName = resolvedFullName({
      name: args.name,
      fullName: args.fullName,
    });

    const countryId = await ctx.db.insert("countries", {
      name: args.name,
      code: "",
      iso3: "",
      flag: args.flag,
      ...(fullName ? { fullName } : {}),
    });

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "created",
      entityType: "country",
      entityId: countryId,
      details: {
        name: args.name,
        flag: args.flag,
        fullName,
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
    fullName: v.optional(v.string()),
  },
  returns: v.id("countries"),
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Country not found");
    }

    const fullName =
      args.fullName !== undefined
        ? args.fullName.trim() ||
          resolveOfficialCountryName(existing.code, args.name)
        : existing.fullName;

    await ctx.db.patch(args.id, {
      name: args.name,
      flag: args.flag,
      fullName,
    });

    const changes = buildChangedFields(
      {
        name: existing.name,
        flag: existing.flag,
        fullName: existing.fullName,
      },
      {
        name: args.name,
        flag: args.flag,
        fullName,
      },
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
 * Fill empty official country names from the canonical Portuguese mapping.
 * Existing custom full names are left untouched.
 */
export const fillMissingOfficialNames = mutation({
  args: {},
  returns: v.object({
    updated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const countries = await ctx.db.query("countries").collect();
    let updated = 0;
    let skipped = 0;

    for (const country of countries) {
      if (country.fullName?.trim()) {
        skipped += 1;
        continue;
      }

      const official = resolveOfficialCountryName(country.code, country.name);
      if (!official) {
        skipped += 1;
        continue;
      }

      await ctx.db.patch(country._id, { fullName: official });
      updated += 1;
    }

    return { updated, skipped };
  },
});

/**
 * Mutation to delete country (admin only)
 */
export const remove = mutation({
  args: { id: v.id("countries") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const adminProfile = await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Country not found");
    }

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
        fullName: existing.fullName,
      },
    });

    return null;
  },
});
