import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { internal } from "./_generated/api";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to list all companies with optional filtering
 * Access control: Admin sees all companies, clients see only their company
 * Supports accent-insensitive search across company names, addresses, and emails
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    let companies = await ctx.db.query("companies").collect();

    // Apply role-based access control
    if (userProfile.role === "client") {
      // Clients can only see their own company
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }
      companies = companies.filter((c) => c._id === userProfile.companyId);
    }
    // Admin users see all companies

    // Filter by isActive if specified
    if (args.isActive !== undefined) {
      companies = companies.filter((c) => c.isActive === args.isActive);
    }

    // Filter by search query if provided (accent-insensitive)
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      companies = companies.filter(
        (company) =>
          normalizeString(company.name).includes(searchNormalized) ||
          (company.address && normalizeString(company.address).includes(searchNormalized)) ||
          (company.addressStreet && normalizeString(company.addressStreet).includes(searchNormalized)) ||
          (company.addressNeighborhood && normalizeString(company.addressNeighborhood).includes(searchNormalized)) ||
          (company.addressPostalCode && normalizeString(company.addressPostalCode).includes(searchNormalized)) ||
          (company.email && normalizeString(company.email).includes(searchNormalized))
      );
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
 * Access control: Admin sees all active companies, clients see only their company if active
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    let companies = await ctx.db
      .query("companies")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Apply role-based access control
    if (userProfile.role === "client") {
      // Clients can only see their own company
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }
      companies = companies.filter((c) => c._id === userProfile.companyId);
    }

    return companies;
  },
});

/**
 * Query to get a single company by ID
 * Access control: Admins can view any company, clients can only view their own company
 */
export const get = query({
  args: { id: v.id("companies") },
  handler: async (ctx, { id }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const company = await ctx.db.get(id);
    if (!company) return null;

    // Check access permissions
    if (userProfile.role === "client") {
      if (!userProfile.companyId || company._id !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view this company"
        );
      }
    }

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
 * Mutation to create a new company (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    taxId: v.optional(v.string()),
    openingDate: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility
    addressStreet: v.optional(v.string()),
    addressNumber: v.optional(v.string()),
    addressComplement: v.optional(v.string()),
    addressNeighborhood: v.optional(v.string()),
    addressPostalCode: v.optional(v.string()),
    cityId: v.optional(v.id("cities")),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    contactPersonId: v.optional(v.id("people")),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const now = Date.now();

    const companyId = await ctx.db.insert("companies", {
      name: args.name,
      taxId: args.taxId,
      openingDate: args.openingDate,
      website: args.website,
      address: args.address,
      addressStreet: args.addressStreet,
      addressNumber: args.addressNumber,
      addressComplement: args.addressComplement,
      addressNeighborhood: args.addressNeighborhood,
      addressPostalCode: args.addressPostalCode,
      cityId: args.cityId,
      phoneNumber: args.phoneNumber,
      email: args.email,
      contactPersonId: args.contactPersonId,
      isActive: args.isActive ?? true,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity (non-blocking, only if user has userId)
    try {
      if (userProfile.userId) {
        const city = args.cityId ? await ctx.db.get(args.cityId) : null;

        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: "created",
          entityType: "company",
          entityId: companyId,
          details: {
            name: args.name,
            taxId: args.taxId,
            email: args.email,
            cityName: city?.name,
            isActive: args.isActive ?? true,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return companyId;
  },
});

/**
 * Mutation to update a company (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("companies"),
    name: v.string(),
    taxId: v.optional(v.string()),
    openingDate: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility
    addressStreet: v.optional(v.string()),
    addressNumber: v.optional(v.string()),
    addressComplement: v.optional(v.string()),
    addressNeighborhood: v.optional(v.string()),
    addressPostalCode: v.optional(v.string()),
    cityId: v.optional(v.id("cities")),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    contactPersonId: v.optional(v.id("people")),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const company = await ctx.db.get(args.id);
    if (!company) {
      throw new Error("Company not found");
    }

    const { id, ...data } = args;

    await ctx.db.patch(id, {
      name: data.name,
      taxId: data.taxId,
      openingDate: data.openingDate,
      website: data.website,
      address: data.address,
      addressStreet: data.addressStreet,
      addressNumber: data.addressNumber,
      addressComplement: data.addressComplement,
      addressNeighborhood: data.addressNeighborhood,
      addressPostalCode: data.addressPostalCode,
      cityId: data.cityId,
      phoneNumber: data.phoneNumber,
      email: data.email,
      contactPersonId: data.contactPersonId,
      isActive: data.isActive ?? true,
      notes: data.notes,
      updatedAt: Date.now(),
    });

    // Log activity with before/after values (non-blocking)
    try {
      const changedFields: Record<string, { before: any; after: any }> = {};

      // Compare each field
      if (data.name !== company.name) {
        changedFields.name = { before: company.name, after: data.name };
      }
      if (data.taxId !== company.taxId) {
        changedFields.taxId = { before: company.taxId, after: data.taxId };
      }
      if (data.email !== company.email) {
        changedFields.email = { before: company.email, after: data.email };
      }
      if (data.phoneNumber !== company.phoneNumber) {
        changedFields.phoneNumber = { before: company.phoneNumber, after: data.phoneNumber };
      }
      if (data.address !== company.address) {
        changedFields.address = { before: company.address, after: data.address };
      }
      if (data.cityId !== company.cityId) {
        const [oldCity, newCity] = await Promise.all([
          company.cityId ? ctx.db.get(company.cityId) : null,
          data.cityId ? ctx.db.get(data.cityId) : null,
        ]);
        changedFields.city = {
          before: oldCity?.name ?? null,
          after: newCity?.name ?? null,
        };
      }
      if (data.isActive !== company.isActive) {
        changedFields.isActive = { before: company.isActive, after: data.isActive };
      }

      if (Object.keys(changedFields).length > 0 && userProfile.userId) {
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: data.isActive === false && company.isActive === true ? "deactivated" : "updated",
          entityType: "company",
          entityId: id,
          details: {
            name: company.name,
            changes: changedFields,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Mutation to delete a company (admin only)
 */
export const remove = mutation({
  args: { id: v.id("companies") },
  handler: async (ctx, { id }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const company = await ctx.db.get(id);
    if (!company) {
      throw new Error("Company not found");
    }

    // Check if there are main processes associated with this company
    const mainProcesses = await ctx.db
      .query("mainProcesses")
      .withIndex("by_company", (q) => q.eq("companyId", id))
      .first();

    if (mainProcesses) {
      throw new Error("Cannot delete company with associated main processes");
    }

    await ctx.db.delete(id);

    // Log activity (non-blocking, only if user has userId)
    try {
      if (userProfile.userId) {
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: "deleted",
          entityType: "company",
          entityId: id,
          details: {
            name: company.name,
            taxId: company.taxId,
            email: company.email,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  },
});

/**
 * Query to get all economic activities for a company
 */
export const getEconomicActivities = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    // Get all junction table entries for this company
    const links = await ctx.db
      .query("companiesEconomicActivities")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    // Fetch the actual economic activity data
    const activities = await Promise.all(
      links.map(async (link) => {
        const activity = await ctx.db.get(link.economicActivityId);
        return activity;
      })
    );

    // Filter out any null values (in case an activity was deleted)
    return activities.filter((activity) => activity !== null);
  },
});

/**
 * Mutation to add an economic activity to a company
 */
export const addEconomicActivity = mutation({
  args: {
    companyId: v.id("companies"),
    economicActivityId: v.id("economicActivities"),
  },
  handler: async (ctx, { companyId, economicActivityId }) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Verify company exists
    const company = await ctx.db.get(companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Verify economic activity exists
    const activity = await ctx.db.get(economicActivityId);
    if (!activity) {
      throw new Error("Economic activity not found");
    }

    // Check for duplicate link
    const existingLink = await ctx.db
      .query("companiesEconomicActivities")
      .withIndex("by_company_economicActivity", (q) =>
        q.eq("companyId", companyId).eq("economicActivityId", economicActivityId)
      )
      .first();

    if (existingLink) {
      // Already linked, just return the existing ID
      return existingLink._id;
    }

    // Create the link
    const linkId = await ctx.db.insert("companiesEconomicActivities", {
      companyId,
      economicActivityId,
      createdAt: Date.now(),
      createdBy: userProfile.userId as Id<"users">,
    });

    return linkId;
  },
});

/**
 * Mutation to remove an economic activity from a company
 */
export const removeEconomicActivity = mutation({
  args: {
    companyId: v.id("companies"),
    economicActivityId: v.id("economicActivities"),
  },
  handler: async (ctx, { companyId, economicActivityId }) => {
    await getCurrentUserProfile(ctx);

    // Find the link
    const link = await ctx.db
      .query("companiesEconomicActivities")
      .withIndex("by_company_economicActivity", (q) =>
        q.eq("companyId", companyId).eq("economicActivityId", economicActivityId)
      )
      .first();

    if (!link) {
      // Already removed or never existed
      return;
    }

    // Delete the link
    await ctx.db.delete(link._id);
  },
});

/**
 * Mutation to set all economic activities for a company (replaces existing)
 * This is used when saving company forms to sync the economic activities
 */
export const setEconomicActivities = mutation({
  args: {
    companyId: v.id("companies"),
    economicActivityIds: v.array(v.id("economicActivities")),
  },
  handler: async (ctx, { companyId, economicActivityIds }) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Verify company exists
    const company = await ctx.db.get(companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Get all existing links
    const existingLinks = await ctx.db
      .query("companiesEconomicActivities")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    const existingIds = existingLinks.map((link) => link.economicActivityId);
    const newIds = economicActivityIds;

    // Find activities to add (in newIds but not in existingIds)
    const toAdd = newIds.filter((id) => !existingIds.includes(id));

    // Find activities to remove (in existingIds but not in newIds)
    const toRemove = existingLinks.filter((link) => !newIds.includes(link.economicActivityId));

    // Remove old links
    await Promise.all(toRemove.map((link) => ctx.db.delete(link._id)));

    // Add new links
    const now = Date.now();
    await Promise.all(
      toAdd.map((activityId) =>
        ctx.db.insert("companiesEconomicActivities", {
          companyId,
          economicActivityId: activityId,
          createdAt: now,
          createdBy: userProfile.userId as Id<"users">,
        })
      )
    );
  },
});
