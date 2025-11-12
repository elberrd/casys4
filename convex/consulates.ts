import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

export const list = query({
  args: {
    cityId: v.optional(v.id("cities")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let consulates = await ctx.db.query("consulates").collect();

    if (args.cityId !== undefined) {
      consulates = consulates.filter((c) => c.cityId === args.cityId);
    }

    const consulatesWithLocation = await Promise.all(
      consulates.map(async (consulate) => {
        const city = consulate.cityId ? await ctx.db.get(consulate.cityId) : null;
        let state = null;
        let country = null;

        if (city && city.stateId) {
          state = await ctx.db.get(city.stateId);
          if (state && state.countryId) {
            country = await ctx.db.get(state.countryId);
          }
        }

        return {
          ...consulate,
          city: city
            ? {
                _id: city._id,
                name: city.name,
              }
            : null,
          state: state
            ? {
                _id: state._id,
                name: state.name,
              }
            : null,
          country: country
            ? {
                _id: country._id,
                name: country.name,
                code: country.code,
              }
            : null,
        };
      })
    );

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      return consulatesWithLocation.filter((consulate) => {
        const name = normalizeString(consulate.name);
        const address = consulate.address ? normalizeString(consulate.address) : "";
        const email = consulate.email ? normalizeString(consulate.email) : "";

        return (
          name.includes(searchNormalized) ||
          address.includes(searchNormalized) ||
          email.includes(searchNormalized)
        );
      });
    }

    return consulatesWithLocation;
  },
});

export const get = query({
  args: { id: v.id("consulates") },
  handler: async (ctx, args) => {
    const consulate = await ctx.db.get(args.id);
    if (!consulate) return null;

    const city = consulate.cityId ? await ctx.db.get(consulate.cityId) : null;
    let state = null;
    let country = null;

    if (city && city.stateId) {
      state = await ctx.db.get(city.stateId);
      if (state && state.countryId) {
        country = await ctx.db.get(state.countryId);
      }
    }

    return {
      ...consulate,
      city: city
        ? {
            _id: city._id,
            name: city.name,
          }
        : null,
      state: state
        ? {
            _id: state._id,
            name: state.name,
          }
        : null,
      country: country
        ? {
            _id: country._id,
            name: country.name,
            code: country.code,
          }
        : null,
    };
  },
});

/**
 * Mutation to create consulate (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    cityId: v.optional(v.id("cities")),
    address: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    return await ctx.db.insert("consulates", {
      name: args.name,
      cityId: args.cityId,
      address: args.address,
      phoneNumber: args.phoneNumber,
      email: args.email,
      website: args.website,
    });
  },
});

/**
 * Mutation to update consulate (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("consulates"),
    name: v.string(),
    cityId: v.optional(v.id("cities")),
    address: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...updateData } = args;

    await ctx.db.patch(id, updateData);
  },
});

/**
 * Mutation to delete consulate (admin only)
 */
export const remove = mutation({
  args: { id: v.id("consulates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // TODO: Add cascade check when main processes table is implemented
    // Check if any main processes reference this consulate
    await ctx.db.delete(args.id);
  },
});
