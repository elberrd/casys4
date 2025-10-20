import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";

/**
 * Query to list people-company relationships with optional filters
 * Access control: Admins see all relationships, clients see only their company's relationships
 */
export const list = query({
  args: {
    personId: v.optional(v.id("people")),
    companyId: v.optional(v.id("companies")),
    isCurrent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

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

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Filter to only relationships involving client's company
      relationships = relationships.filter(
        (r) => r.companyId === userProfile.companyId
      );
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

/**
 * Query to list relationships by person
 * Access control: Admins can list any person's relationships, clients can only list their company's people
 */
export const listByPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const relationships = await ctx.db
      .query("peopleCompanies")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .collect();

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Check if any relationship involves client's company
      const hasAccess = relationships.some(
        (r) => r.companyId === userProfile.companyId
      );

      if (!hasAccess) {
        throw new Error(
          "Access denied: This person is not associated with your company"
        );
      }

      // Filter to only show relationships with client's company
      const filteredRelationships = relationships.filter(
        (r) => r.companyId === userProfile.companyId
      );

      const relationshipsWithData = await Promise.all(
        filteredRelationships.map(async (relationship) => {
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
    }

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

/**
 * Query to list relationships by company
 * Access control: Admins can list any company's relationships, clients can only list their company
 */
export const listByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      if (args.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You can only view relationships for your own company"
        );
      }
    }

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

/**
 * Query to get a single relationship by ID
 * Access control: Admins can view any relationship, clients can only view their company's relationships
 */
export const get = query({
  args: { id: v.id("peopleCompanies") },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const relationship = await ctx.db.get(args.id);
    if (!relationship) return null;

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      if (relationship.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view this relationship"
        );
      }
    }

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

/**
 * Mutation to create a new people-company relationship (admin only)
 */
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
    // Require admin role
    await requireAdmin(ctx);

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

/**
 * Mutation to update a people-company relationship (admin only)
 */
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
    // Require admin role
    await requireAdmin(ctx);

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

/**
 * Mutation to delete a people-company relationship (admin only)
 */
export const remove = mutation({
  args: { id: v.id("peopleCompanies") },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    await ctx.db.delete(args.id);
  },
});
