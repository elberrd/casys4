import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Query to list all companies with optional filtering
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let companies = await ctx.db.query("companies").collect();

    // Filter by isActive if specified
    if (args.isActive !== undefined) {
      companies = companies.filter((c) => c.isActive === args.isActive);
    }

    // Fetch related data for each company
    const companiesWithRelations = await Promise.all(
      companies.map(async (company) => {
        const city = company.cityId ? await ctx.db.get(company.cityId) : null;
        const state = city?.stateId ? await ctx.db.get(city.stateId) : null;
        const country = state?.countryId
          ? await ctx.db.get(state.countryId)
          : null;
        const contactPerson = company.contactPersonId
          ? await ctx.db.get(company.contactPersonId)
          : null;

        return {
          ...company,
          city,
          state,
          country,
          contactPerson,
        };
      })
    );

    return companiesWithRelations;
  },
});

/**
 * Query to list only active companies (for dropdown selections)
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

/**
 * Query to get a single company by ID
 */
export const get = query({
  args: { id: v.id("companies") },
  handler: async (ctx, { id }) => {
    const company = await ctx.db.get(id);
    if (!company) return null;

    // Fetch related data
    const city = company.cityId ? await ctx.db.get(company.cityId) : null;
    const state = city?.stateId ? await ctx.db.get(city.stateId) : null;
    const country = state?.countryId
      ? await ctx.db.get(state.countryId)
      : null;
    const contactPerson = company.contactPersonId
      ? await ctx.db.get(company.contactPersonId)
      : null;

    return {
      ...company,
      city,
      state,
      country,
      contactPerson,
    };
  },
});

/**
 * Mutation to create a new company
 */
export const create = mutation({
  args: {
    name: v.string(),
    taxId: v.string(),
    website: v.optional(v.string()),
    address: v.string(),
    cityId: v.id("cities"),
    phoneNumber: v.string(),
    email: v.string(),
    contactPersonId: v.optional(v.id("people")),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const companyId = await ctx.db.insert("companies", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    return companyId;
  },
});

/**
 * Mutation to update a company
 */
export const update = mutation({
  args: {
    id: v.id("companies"),
    name: v.string(),
    taxId: v.string(),
    website: v.optional(v.string()),
    address: v.string(),
    cityId: v.id("cities"),
    phoneNumber: v.string(),
    email: v.string(),
    contactPersonId: v.optional(v.id("people")),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;

    await ctx.db.patch(id, {
      ...data,
      updatedAt: Date.now(),
    });

    return id;
  },
});

/**
 * Mutation to delete a company
 */
export const remove = mutation({
  args: { id: v.id("companies") },
  handler: async (ctx, { id }) => {
    // TODO: Add cascade check when mainProcesses table is implemented
    // Check if there are main processes associated with this company
    // const mainProcesses = await ctx.db
    //   .query("mainProcesses")
    //   .withIndex("by_company", (q) => q.eq("companyId", id))
    //   .first();
    //
    // if (mainProcesses) {
    //   throw new Error("Cannot delete company with associated main processes");
    // }

    await ctx.db.delete(id);
  },
});
