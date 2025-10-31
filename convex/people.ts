import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to list all people with optional search
 * Access control: Admins see all people, clients see only people from their company
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    let people = await ctx.db.query("people").collect();

    // Apply role-based access control via peopleCompanies relationship
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Get all peopleCompanies relationships for client's company
      const clientCompanyId = userProfile.companyId; // Assign to const for type narrowing
      const companyPeople = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_company", (q) => q.eq("companyId", clientCompanyId))
        .collect();

      const allowedPersonIds = new Set(companyPeople.map((pc) => pc.personId));

      // Filter to only people associated with client's company
      people = people.filter((person) => allowedPersonIds.has(person._id));
    }

    // Filter by search query if provided (accent-insensitive)
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      people = people.filter(
        (person) =>
          normalizeString(person.fullName).includes(searchNormalized) ||
          (person.email && normalizeString(person.email).includes(searchNormalized)) ||
          (person.cpf && person.cpf.includes(searchNormalized))
      );
    }

    // Fetch related data for each person
    const peopleWithRelations = await Promise.all(
      people.map(async (person) => {
        const birthCity = person.birthCityId
          ? await ctx.db.get(person.birthCityId)
          : null;
        const birthState = birthCity?.stateId
          ? await ctx.db.get(birthCity.stateId)
          : null;
        const currentCity = person.currentCityId
          ? await ctx.db.get(person.currentCityId)
          : null;
        const currentState = currentCity?.stateId
          ? await ctx.db.get(currentCity.stateId)
          : null;
        const nationality = person.nationalityId
          ? await ctx.db.get(person.nationalityId)
          : null;

        return {
          ...person,
          birthCity,
          birthState,
          currentCity,
          currentState,
          nationality,
        };
      })
    );

    return peopleWithRelations;
  },
});

/**
 * Query to search people (for typeahead/combobox)
 * Access control: Admins see all people, clients see only people from their company
 */
export const search = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const queryLower = args.query.toLowerCase();
    let people = await ctx.db.query("people").collect();

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Get allowed person IDs for client's company
      const clientCompanyId = userProfile.companyId; // Assign to const for type narrowing
      const companyPeople = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_company", (q) => q.eq("companyId", clientCompanyId))
        .collect();

      const allowedPersonIds = new Set(companyPeople.map((pc) => pc.personId));
      people = people.filter((person) => allowedPersonIds.has(person._id));
    }

    // Accent-insensitive search
    const queryNormalized = normalizeString(args.query);
    return people
      .filter(
        (person) =>
          normalizeString(person.fullName).includes(queryNormalized) ||
          (person.email && normalizeString(person.email).includes(queryNormalized)) ||
          (person.cpf && person.cpf.includes(queryNormalized))
      )
      .slice(0, 10); // Limit to 10 results for performance
  },
});

/**
 * Query to get a single person by ID
 * Access control: Admins can view any person, clients can only view people from their company
 */
export const get = query({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const person = await ctx.db.get(id);
    if (!person) return null;

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
          q.eq("personId", id).eq("companyId", clientCompanyId)
        )
        .first();

      if (!personCompany) {
        throw new Error(
          "Access denied: You do not have permission to view this person"
        );
      }
    }

    // Fetch related data
    const birthCity = person.birthCityId
      ? await ctx.db.get(person.birthCityId)
      : null;
    const birthState = birthCity?.stateId
      ? await ctx.db.get(birthCity.stateId)
      : null;
    const currentCity = person.currentCityId
      ? await ctx.db.get(person.currentCityId)
      : null;
    const currentState = currentCity?.stateId
      ? await ctx.db.get(currentCity.stateId)
      : null;
    const nationality = person.nationalityId
      ? await ctx.db.get(person.nationalityId)
      : null;

    return {
      ...person,
      birthCity,
      birthState,
      currentCity,
      currentState,
      nationality,
    };
  },
});

/**
 * Mutation to create a new person (admin only)
 */
export const create = mutation({
  args: {
    fullName: v.string(),
    email: v.optional(v.string()),
    cpf: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    birthCityId: v.optional(v.id("cities")),
    nationalityId: v.optional(v.id("countries")),
    maritalStatus: v.optional(v.string()),
    profession: v.optional(v.string()),
    motherName: v.optional(v.string()),
    fatherName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    currentCityId: v.optional(v.id("cities")),
    photoUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const now = Date.now();

    const personId = await ctx.db.insert("people", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    return personId;
  },
});

/**
 * Mutation to update a person (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("people"),
    fullName: v.string(),
    email: v.optional(v.string()),
    cpf: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    birthCityId: v.optional(v.id("cities")),
    nationalityId: v.optional(v.id("countries")),
    maritalStatus: v.optional(v.string()),
    profession: v.optional(v.string()),
    motherName: v.optional(v.string()),
    fatherName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    currentCityId: v.optional(v.id("cities")),
    photoUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const { id, ...data } = args;

    await ctx.db.patch(id, {
      ...data,
      updatedAt: Date.now(),
    });

    return id;
  },
});

/**
 * Mutation to delete a person (admin only)
 */
export const remove = mutation({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    // Require admin role
    await requireAdmin(ctx);

    // Check if there are individual processes associated with this person
    const individualProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_person", (q) => q.eq("personId", id))
      .first();

    if (individualProcesses) {
      throw new Error("Cannot delete person with associated individual processes");
    }

    // Check if there are passports associated with this person
    const passports = await ctx.db
      .query("passports")
      .withIndex("by_person", (q) => q.eq("personId", id))
      .first();

    if (passports) {
      throw new Error("Cannot delete person with associated passports");
    }

    // Check if there are people-companies relationships associated with this person
    const peopleCompanies = await ctx.db
      .query("peopleCompanies")
      .withIndex("by_person", (q) => q.eq("personId", id))
      .first();

    if (peopleCompanies) {
      throw new Error("Cannot delete person with associated employment history");
    }

    await ctx.db.delete(id);
  },
});
