import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { buildChangedFields, logActivitySafely } from "./lib/activityLogger";
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
    const adminProfile = await requireAdmin(ctx);

    const consulateId = await ctx.db.insert("consulates", {
      cityId: args.cityId,
      address: args.address,
      phoneNumber: args.phoneNumber,
      email: args.email,
      website: args.website,
    });

    const city = args.cityId ? await ctx.db.get(args.cityId) : null;
    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "created",
      entityType: "consulate",
      entityId: consulateId,
      details: {
        cityName: city?.name,
        email: args.email,
        phoneNumber: args.phoneNumber,
      },
    });

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
    const adminProfile = await requireAdmin(ctx);

    const { id, ...updateData } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Consulate not found");
    }

    await ctx.db.patch(id, updateData);

    const [oldCity, newCity] = await Promise.all([
      existing.cityId ? ctx.db.get(existing.cityId) : null,
      updateData.cityId ? ctx.db.get(updateData.cityId) : null,
    ]);

    const changes = buildChangedFields(
      {
        city: oldCity?.name ?? null,
        address: existing.address,
        phoneNumber: existing.phoneNumber,
        email: existing.email,
        website: existing.website,
      },
      {
        city: newCity?.name ?? null,
        address: updateData.address,
        phoneNumber: updateData.phoneNumber,
        email: updateData.email,
        website: updateData.website,
      }
    );

    if (Object.keys(changes).length > 0) {
      await logActivitySafely(ctx, {
        userId: adminProfile.userId,
        action: "updated",
        entityType: "consulate",
        entityId: id,
        details: {
          changes,
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
    const adminProfile = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Consulate not found");
    }

    // TODO: Add cascade check when main processes table is implemented
    // Check if any main processes reference this consulate
    await ctx.db.delete(args.id);

    const city = existing.cityId ? await ctx.db.get(existing.cityId) : null;
    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "deleted",
      entityType: "consulate",
      entityId: args.id,
      details: {
        cityName: city?.name,
        email: existing.email,
      },
    });
  },
});
