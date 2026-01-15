import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

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
    search: v.optional(v.string()),
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
        const person = passport.personId ? await ctx.db.get(passport.personId) : null;
        const country = passport.issuingCountryId ? await ctx.db.get(passport.issuingCountryId) : null;

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
                code: country.code,
              }
            : null,
          status: passport.expiryDate ? calculateStatus(passport.expiryDate) : "Expired",
        };
      })
    );

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      return passportsWithRelations.filter((passport) => {
        const passportNumber = passport.passportNumber ? normalizeString(passport.passportNumber) : "";
        const personName = passport.person?.fullName ? normalizeString(passport.person.fullName) : "";

        return (
          passportNumber.includes(searchNormalized) ||
          personName.includes(searchNormalized)
        );
      });
    }

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
        const country = passport.issuingCountryId ? await ctx.db.get(passport.issuingCountryId) : null;

        return {
          ...passport,
          issuingCountry: country
            ? {
                _id: country._id,
                name: country.name,
                code: country.code,
              }
            : null,
          status: passport.expiryDate ? calculateStatus(passport.expiryDate) : "Expired",
        };
      })
    );

    return passportsWithRelations;
  },
});

/**
 * Query to get the active passport for a person
 * Access control: Admins can view any person's active passport, clients can only view their company's people
 */
export const getActivePassportByPerson = query({
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

    const activePassport = await ctx.db
      .query("passports")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!activePassport) return null;

    const country = activePassport.issuingCountryId
      ? await ctx.db.get(activePassport.issuingCountryId)
      : null;

    return {
      ...activePassport,
      issuingCountry: country
        ? {
            _id: country._id,
            name: country.name,
          }
        : null,
      status: activePassport.expiryDate ? calculateStatus(activePassport.expiryDate) : "Expired",
    };
  },
});

/**
 * Query to count passports for a person
 * Access control: Admins can count any person's passports, clients can only count their company's people
 */
export const countByPerson = query({
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

    return passports.length;
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

    const person = passport.personId ? await ctx.db.get(passport.personId) : null;
    const country = passport.issuingCountryId ? await ctx.db.get(passport.issuingCountryId) : null;

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
      status: passport.expiryDate ? calculateStatus(passport.expiryDate) : "Expired",
    };
  },
});

/**
 * Mutation to create a new passport (admin only)
 * Enforces single active passport rule: if isActive is true, deactivates all other passports for the person
 */
export const create = mutation({
  args: {
    personId: v.id("people"),
    passportNumber: v.string(),
    issuingCountryId: v.id("countries"),
    issueDate: v.string(),
    expiryDate: v.string(),
    fileUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const now = Date.now();
    const isActive = args.isActive ?? true;

    // If creating an active passport, deactivate all other passports for this person
    if (isActive) {
      const existingPassports = await ctx.db
        .query("passports")
        .withIndex("by_person", (q) => q.eq("personId", args.personId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Deactivate all existing active passports
      await Promise.all(
        existingPassports.map((passport) =>
          ctx.db.patch(passport._id, {
            isActive: false,
            updatedAt: now,
          })
        )
      );
    }

    const passportId = await ctx.db.insert("passports", {
      personId: args.personId,
      passportNumber: args.passportNumber,
      issuingCountryId: args.issuingCountryId,
      issueDate: args.issueDate,
      expiryDate: args.expiryDate,
      fileUrl: args.fileUrl,
      isActive,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    if (userProfile.userId) {
      const person = await ctx.db.get(args.personId);
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "passports",
        entityId: passportId,
        details: {
          passportNumber: args.passportNumber,
          personName: person?.fullName,
          isActive,
        },
      });
    }

    return passportId;
  },
});

/**
 * Mutation to update a passport (admin only)
 * Enforces single active passport rule: if isActive is set to true, deactivates all other passports for the person
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
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const { id, ...updateData } = args;
    const now = Date.now();
    const isActive = updateData.isActive ?? true;

    // If setting this passport as active, deactivate all other passports for this person
    if (isActive) {
      const existingPassports = await ctx.db
        .query("passports")
        .withIndex("by_person", (q) => q.eq("personId", args.personId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Deactivate all existing active passports except the one being updated
      await Promise.all(
        existingPassports
          .filter((passport) => passport._id !== id)
          .map((passport) =>
            ctx.db.patch(passport._id, {
              isActive: false,
              updatedAt: now,
            })
          )
      );
    }

    await ctx.db.patch(id, {
      ...updateData,
      isActive,
      updatedAt: now,
    });

    // Log activity
    if (userProfile.userId) {
      const person = await ctx.db.get(args.personId);
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "updated",
        entityType: "passports",
        entityId: id,
        details: {
          passportNumber: args.passportNumber,
          personName: person?.fullName,
          isActive,
        },
      });
    }
  },
});

/**
 * Mutation to delete a passport (admin only)
 */
export const remove = mutation({
  args: { id: v.id("passports") },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    // Get passport data before deletion for logging
    const passport = await ctx.db.get(args.id);
    if (!passport) {
      throw new Error("Passport not found");
    }

    const person = await ctx.db.get(passport.personId);

    await ctx.db.delete(args.id);

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "passports",
        entityId: args.id,
        details: {
          passportNumber: passport.passportNumber,
          personName: person?.fullName,
        },
      });
    }
  },
});
