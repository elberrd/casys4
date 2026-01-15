import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
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
        const cityName = consulate.city?.name ? normalizeString(consulate.city.name) : "";
        const address = consulate.address ? normalizeString(consulate.address) : "";
        const email = consulate.email ? normalizeString(consulate.email) : "";

        return (
          cityName.includes(searchNormalized) ||
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
    cityId: v.optional(v.id("cities")),
    address: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    const consulateId = await ctx.db.insert("consulates", {
      cityId: args.cityId,
      address: args.address,
      phoneNumber: args.phoneNumber,
      email: args.email,
      website: args.website,
    });

    // Log activity
    if (userProfile.userId) {
      const city = args.cityId ? await ctx.db.get(args.cityId) : null;
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "consulates",
        entityId: consulateId,
        details: {
          cityName: city?.name,
          address: args.address,
        },
      });
    }

    return consulateId;
  },
});

/**
 * Mutation to update consulate (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("consulates"),
    cityId: v.optional(v.id("cities")),
    address: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    const { id, ...updateData } = args;

    await ctx.db.patch(id, updateData);

    // Log activity
    if (userProfile.userId) {
      const city = args.cityId ? await ctx.db.get(args.cityId) : null;
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "updated",
        entityType: "consulates",
        entityId: id,
        details: {
          cityName: city?.name,
          address: args.address,
        },
      });
    }
  },
});

/**
 * Mutation to delete consulate (admin only)
 */
export const remove = mutation({
  args: { id: v.id("consulates") },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    // Get consulate data before deletion for logging
    const consulate = await ctx.db.get(args.id);
    if (!consulate) {
      throw new Error("Consulate not found");
    }

    const city = consulate.cityId ? await ctx.db.get(consulate.cityId) : null;

    // TODO: Add cascade check when main processes table is implemented
    // Check if any main processes reference this consulate
    await ctx.db.delete(args.id);

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "consulates",
        entityId: args.id,
        details: {
          cityName: city?.name,
          address: consulate.address,
        },
      });
    }
  },
});
