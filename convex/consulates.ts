import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {
    cityId: v.optional(v.id("cities")),
  },
  handler: async (ctx, args) => {
    let consulates = await ctx.db.query("consulates").collect();

    if (args.cityId !== undefined) {
      consulates = consulates.filter((c) => c.cityId === args.cityId);
    }

    const consulatesWithLocation = await Promise.all(
      consulates.map(async (consulate) => {
        const city = await ctx.db.get(consulate.cityId);
        let state = null;
        let country = null;

        if (city) {
          state = await ctx.db.get(city.stateId);
          if (state) {
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
              }
            : null,
        };
      })
    );

    return consulatesWithLocation;
  },
});

export const get = query({
  args: { id: v.id("consulates") },
  handler: async (ctx, args) => {
    const consulate = await ctx.db.get(args.id);
    if (!consulate) return null;

    const city = await ctx.db.get(consulate.cityId);
    let state = null;
    let country = null;

    if (city) {
      state = await ctx.db.get(city.stateId);
      if (state) {
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
          }
        : null,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    cityId: v.id("cities"),
    address: v.string(),
    phoneNumber: v.string(),
    email: v.string(),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

export const update = mutation({
  args: {
    id: v.id("consulates"),
    name: v.string(),
    cityId: v.id("cities"),
    address: v.string(),
    phoneNumber: v.string(),
    email: v.string(),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;

    await ctx.db.patch(id, updateData);
  },
});

export const remove = mutation({
  args: { id: v.id("consulates") },
  handler: async (ctx, args) => {
    // TODO: Add cascade check when main processes table is implemented
    // Check if any main processes reference this consulate
    await ctx.db.delete(args.id);
  },
});
