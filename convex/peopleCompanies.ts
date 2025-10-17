import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {
    personId: v.optional(v.id("people")),
    companyId: v.optional(v.id("companies")),
    isCurrent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let relationships = await ctx.db.query("peopleCompanies").collect();

    if (args.personId !== undefined) {
      relationships = relationships.filter((r) => r.personId === args.personId);
    }

    if (args.companyId !== undefined) {
      relationships = relationships.filter((r) => r.companyId === args.companyId);
    }

    if (args.isCurrent !== undefined) {
      relationships = relationships.filter((r) => r.isCurrent === args.isCurrent);
    }

    const relationshipsWithData = await Promise.all(
      relationships.map(async (relationship) => {
        const person = await ctx.db.get(relationship.personId);
        const company = await ctx.db.get(relationship.companyId);

        return {
          ...relationship,
          person: person
            ? {
                _id: person._id,
                fullName: person.fullName,
              }
            : null,
          company: company
            ? {
                _id: company._id,
                name: company.name,
              }
            : null,
        };
      })
    );

    return relationshipsWithData;
  },
});

export const listByPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("peopleCompanies")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .collect();

    const relationshipsWithData = await Promise.all(
      relationships.map(async (relationship) => {
        const company = await ctx.db.get(relationship.companyId);

        return {
          ...relationship,
          company: company
            ? {
                _id: company._id,
                name: company.name,
              }
            : null,
        };
      })
    );

    return relationshipsWithData;
  },
});

export const listByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("peopleCompanies")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const relationshipsWithData = await Promise.all(
      relationships.map(async (relationship) => {
        const person = await ctx.db.get(relationship.personId);

        return {
          ...relationship,
          person: person
            ? {
                _id: person._id,
                fullName: person.fullName,
              }
            : null,
        };
      })
    );

    return relationshipsWithData;
  },
});

export const get = query({
  args: { id: v.id("peopleCompanies") },
  handler: async (ctx, args) => {
    const relationship = await ctx.db.get(args.id);
    if (!relationship) return null;

    const person = await ctx.db.get(relationship.personId);
    const company = await ctx.db.get(relationship.companyId);

    return {
      ...relationship,
      person: person
        ? {
            _id: person._id,
            fullName: person.fullName,
          }
        : null,
      company: company
        ? {
            _id: company._id,
            name: company.name,
          }
        : null,
    };
  },
});

export const create = mutation({
  args: {
    personId: v.id("people"),
    companyId: v.id("companies"),
    role: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    isCurrent: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Validate: Only one current employment per person
    if (args.isCurrent) {
      const currentEmployments = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_person", (q) => q.eq("personId", args.personId))
        .collect();

      const hasCurrentEmployment = currentEmployments.some(
        (emp) => emp.isCurrent
      );

      if (hasCurrentEmployment) {
        throw new Error(
          "This person already has a current employment. Please end the current employment before adding a new one."
        );
      }
    }

    // Validate: endDate must be after startDate if provided
    if (args.endDate) {
      const startDate = new Date(args.startDate);
      const endDate = new Date(args.endDate);

      if (endDate <= startDate) {
        throw new Error("End date must be after start date");
      }
    }

    // Validate: isCurrent should not have endDate
    if (args.isCurrent && args.endDate) {
      throw new Error("Current employment cannot have an end date");
    }

    return await ctx.db.insert("peopleCompanies", {
      personId: args.personId,
      companyId: args.companyId,
      role: args.role,
      startDate: args.startDate,
      endDate: args.endDate,
      isCurrent: args.isCurrent,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("peopleCompanies"),
    personId: v.id("people"),
    companyId: v.id("companies"),
    role: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    isCurrent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    const existing = await ctx.db.get(id);

    if (!existing) {
      throw new Error("Employment relationship not found");
    }

    // Validate: Only one current employment per person
    if (args.isCurrent) {
      const currentEmployments = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_person", (q) => q.eq("personId", args.personId))
        .collect();

      const hasOtherCurrentEmployment = currentEmployments.some(
        (emp) => emp.isCurrent && emp._id !== id
      );

      if (hasOtherCurrentEmployment) {
        throw new Error(
          "This person already has a current employment. Please end the current employment before updating this one to current."
        );
      }
    }

    // Validate: endDate must be after startDate if provided
    if (args.endDate) {
      const startDate = new Date(args.startDate);
      const endDate = new Date(args.endDate);

      if (endDate <= startDate) {
        throw new Error("End date must be after start date");
      }
    }

    // Validate: isCurrent should not have endDate
    if (args.isCurrent && args.endDate) {
      throw new Error("Current employment cannot have an end date");
    }

    await ctx.db.patch(id, updateData);
  },
});

export const remove = mutation({
  args: { id: v.id("peopleCompanies") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
