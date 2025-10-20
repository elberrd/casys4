import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";

// Helper function to calculate passport status
function calculateStatus(expiryDate: string): "Valid" | "Expiring Soon" | "Expired" {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

  if (expiry < today) {
    return "Expired";
  } else if (expiry < sixMonthsFromNow) {
    return "Expiring Soon";
  } else {
    return "Valid";
  }
}

/**
 * Query to list all passports with optional filters
 * Access control: Admins see all passports, clients see only passports of people from their company
 */
export const list = query({
  args: {
    personId: v.optional(v.id("people")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    let passports = await ctx.db.query("passports").collect();

    if (args.personId !== undefined) {
      passports = passports.filter((p) => p.personId === args.personId);
    }

    if (args.isActive !== undefined) {
      passports = passports.filter((p) => p.isActive === args.isActive);
    }

    // Apply role-based access control via person's company
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Get all people associated with client's company
      const clientCompanyId = userProfile.companyId; // Assign to const for type narrowing
      const companyPeople = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_company", (q) => q.eq("companyId", clientCompanyId))
        .collect();

      const allowedPersonIds = new Set(companyPeople.map((pc) => pc.personId));

      // Filter passports: keep only those for people from client's company
      passports = passports.filter((passport) =>
        allowedPersonIds.has(passport.personId)
      );
    }

    const passportsWithRelations = await Promise.all(
      passports.map(async (passport) => {
        const person = await ctx.db.get(passport.personId);
        const country = await ctx.db.get(passport.issuingCountryId);

        return {
          ...passport,
          person: person
            ? {
                _id: person._id,
                fullName: person.fullName,
              }
            : null,
          issuingCountry: country
            ? {
                _id: country._id,
                name: country.name,
              }
            : null,
          status: calculateStatus(passport.expiryDate),
        };
      })
    );

    return passportsWithRelations;
  },
});

/**
 * Query to list passports by person
 * Access control: Admins can list any person's passports, clients can only list their company's people
 */
export const listByPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Check if person is associated with client's company
      const clientCompanyId = userProfile.companyId; // Assign to const for type narrowing
      const personCompany = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_person_company", (q) =>
          q.eq("personId", args.personId).eq("companyId", clientCompanyId)
        )
        .first();

      if (!personCompany) {
        throw new Error(
          "Access denied: You do not have permission to view this person's passports"
        );
      }
    }

    const passports = await ctx.db
      .query("passports")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .collect();

    const passportsWithRelations = await Promise.all(
      passports.map(async (passport) => {
        const country = await ctx.db.get(passport.issuingCountryId);

        return {
          ...passport,
          issuingCountry: country
            ? {
                _id: country._id,
                name: country.name,
              }
            : null,
          status: calculateStatus(passport.expiryDate),
        };
      })
    );

    return passportsWithRelations;
  },
});

/**
 * Query to get a single passport by ID
 * Access control: Admins can view any passport, clients can only view passports of their company's people
 */
export const get = query({
  args: { id: v.id("passports") },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const passport = await ctx.db.get(args.id);
    if (!passport) return null;

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Check if person is associated with client's company
      const clientCompanyId = userProfile.companyId; // Assign to const for type narrowing
      const personCompany = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_person_company", (q) =>
          q.eq("personId", passport.personId).eq("companyId", clientCompanyId)
        )
        .first();

      if (!personCompany) {
        throw new Error(
          "Access denied: You do not have permission to view this passport"
        );
      }
    }

    const person = await ctx.db.get(passport.personId);
    const country = await ctx.db.get(passport.issuingCountryId);

    return {
      ...passport,
      person: person
        ? {
            _id: person._id,
            fullName: person.fullName,
          }
        : null,
      issuingCountry: country
        ? {
            _id: country._id,
            name: country.name,
          }
        : null,
      status: calculateStatus(passport.expiryDate),
    };
  },
});

/**
 * Mutation to create a new passport (admin only)
 */
export const create = mutation({
  args: {
    personId: v.id("people"),
    passportNumber: v.string(),
    issuingCountryId: v.id("countries"),
    issueDate: v.string(),
    expiryDate: v.string(),
    fileUrl: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const now = Date.now();

    return await ctx.db.insert("passports", {
      personId: args.personId,
      passportNumber: args.passportNumber,
      issuingCountryId: args.issuingCountryId,
      issueDate: args.issueDate,
      expiryDate: args.expiryDate,
      fileUrl: args.fileUrl,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Mutation to update a passport (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("passports"),
    personId: v.id("people"),
    passportNumber: v.string(),
    issuingCountryId: v.id("countries"),
    issueDate: v.string(),
    expiryDate: v.string(),
    fileUrl: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const { id, ...updateData } = args;

    await ctx.db.patch(id, {
      ...updateData,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mutation to delete a passport (admin only)
 */
export const remove = mutation({
  args: { id: v.id("passports") },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    await ctx.db.delete(args.id);
  },
});
