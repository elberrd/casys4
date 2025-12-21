import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";
import { cleanDocumentNumber } from "../lib/utils/document-masks";

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

        // Get current company for the person
        const personCompany = await ctx.db
          .query("peopleCompanies")
          .withIndex("by_person", (q) => q.eq("personId", person._id))
          .filter((q) => q.eq(q.field("isCurrent"), true))
          .first();

        const company = personCompany?.companyId
          ? await ctx.db.get(personCompany.companyId)
          : null;

        return {
          ...person,
          birthCity,
          birthState,
          currentCity,
          currentState,
          nationality,
          company,
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
 * Query to list people filtered by company
 * Used for cascading selectors where user applicant is filtered by selected company
 * Access control: Admins see all people from specified company, clients see only people from their company
 */
export const listPeopleByCompany = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // For clients, verify they can only access their own company
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }
      if (userProfile.companyId !== args.companyId) {
        throw new Error("Access denied: You can only view people from your own company");
      }
    }

    // Get all current (isCurrent=true) peopleCompanies relationships for the specified company
    const companyPeople = await ctx.db
      .query("peopleCompanies")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("isCurrent"), true))
      .collect();

    // Fetch person details for each relationship
    const people = await Promise.all(
      companyPeople.map(async (pc) => {
        if (!pc.personId) return null;
        const person = await ctx.db.get(pc.personId);
        return person;
      })
    );

    // Filter out null values and return
    return people.filter((person): person is NonNullable<typeof person> => person !== null);
  },
});

/**
 * Query to check if a CPF is already in use by another person
 * Returns availability status and existing person details if duplicate found
 * Access control: Admins can check any CPF, clients can check CPFs (for creating/editing people)
 */
export const checkCpfDuplicate = query({
  args: {
    cpf: v.string(),
    excludePersonId: v.optional(v.id("people")),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Return available if CPF is empty or undefined
    if (!args.cpf || args.cpf.trim() === "") {
      return {
        isAvailable: true,
        existingPerson: null,
      };
    }

    // Clean CPF (remove formatting) before database query
    const cleanedCpf = cleanDocumentNumber(args.cpf);

    // Return available if CPF is incomplete (less than 11 digits)
    if (cleanedCpf.length !== 11) {
      return {
        isAvailable: true,
        existingPerson: null,
      };
    }

    // Query for existing person with this CPF using the by_cpf index
    const existingPerson = await ctx.db
      .query("people")
      .withIndex("by_cpf", (q) => q.eq("cpf", cleanedCpf))
      .first();

    // If no person found, CPF is available
    if (!existingPerson) {
      return {
        isAvailable: true,
        existingPerson: null,
      };
    }

    // If found person is the one being edited (excludePersonId), CPF is available
    if (args.excludePersonId && existingPerson._id === args.excludePersonId) {
      return {
        isAvailable: true,
        existingPerson: null,
      };
    }

    // CPF is taken by another person
    return {
      isAvailable: false,
      existingPerson: {
        _id: existingPerson._id,
        fullName: existingPerson.fullName,
      },
    };
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
    funcao: v.optional(v.string()),
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

    // Check for duplicate CPF if provided
    if (args.cpf) {
      const cleanedCpf = cleanDocumentNumber(args.cpf);

      if (cleanedCpf.length === 11) {
        const existingPerson = await ctx.db
          .query("people")
          .withIndex("by_cpf", (q) => q.eq("cpf", cleanedCpf))
          .first();

        if (existingPerson) {
          throw new Error(
            `CPF ${args.cpf} is already registered to ${existingPerson.fullName}`
          );
        }
      }
    }

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
    funcao: v.optional(v.string()),
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

    // Check for duplicate CPF if provided
    if (data.cpf) {
      const cleanedCpf = cleanDocumentNumber(data.cpf);

      if (cleanedCpf.length === 11) {
        const existingPerson = await ctx.db
          .query("people")
          .withIndex("by_cpf", (q) => q.eq("cpf", cleanedCpf))
          .first();

        // If duplicate found and it's not the current person being updated
        if (existingPerson && existingPerson._id !== id) {
          throw new Error(
            `CPF ${data.cpf} is already registered to ${existingPerson.fullName}`
          );
        }
      }
    }

    // Get current document to preserve system fields
    const current = await ctx.db.get(id);
    if (!current) {
      throw new Error("Person not found");
    }

    // Build replacement document - only include optional fields if they have values
    // To remove an optional field in Convex, don't include it in replace()
    const replacement: any = {
      _id: current._id,
      _creationTime: current._creationTime,
      createdAt: current.createdAt,
      fullName: data.fullName,
      updatedAt: Date.now(),
    };

    // Only include optional fields if they have non-empty values
    if (data.email) replacement.email = data.email;
    if (data.cpf && data.cpf !== "") replacement.cpf = data.cpf;
    if (data.birthDate) replacement.birthDate = data.birthDate;
    if (data.birthCityId) replacement.birthCityId = data.birthCityId;
    if (data.nationalityId) replacement.nationalityId = data.nationalityId;
    if (data.maritalStatus) replacement.maritalStatus = data.maritalStatus;
    if (data.profession) replacement.profession = data.profession;
    if (data.funcao) replacement.funcao = data.funcao;
    if (data.motherName) replacement.motherName = data.motherName;
    if (data.fatherName) replacement.fatherName = data.fatherName;
    if (data.phoneNumber) replacement.phoneNumber = data.phoneNumber;
    if (data.address) replacement.address = data.address;
    if (data.currentCityId) replacement.currentCityId = data.currentCityId;
    if (data.photoUrl) replacement.photoUrl = data.photoUrl;
    if (data.notes) replacement.notes = data.notes;

    await ctx.db.replace(id, replacement);

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

/**
 * Query to list people who have associated companies (for applicant selection)
 * Returns people with their current company information for display in combobox
 * Access control: Admins see all people with companies, clients see only people from their company
 */
export const listPeopleWithCompanies = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Get all people-company relationships where isCurrent=true
    let peopleCompanies = await ctx.db
      .query("peopleCompanies")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .collect();

    // Apply role-based access control for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Filter to only people-companies relationships for client's company
      const clientCompanyId = userProfile.companyId;
      peopleCompanies = peopleCompanies.filter(
        (pc) => pc.companyId === clientCompanyId
      );
    }

    // Build result with person and company information
    const results = await Promise.all(
      peopleCompanies.map(async (pc) => {
        if (!pc.personId || !pc.companyId) return null;

        const person = await ctx.db.get(pc.personId);
        const company = await ctx.db.get(pc.companyId);

        if (!person || !company) return null;

        return {
          _id: person._id,
          fullName: person.fullName,
          companyName: company.name,
          companyId: company._id,
          role: pc.role,
        };
      })
    );

    // Filter out null results
    let filteredResults = results.filter((r) => r !== null);

    // Apply search filter if provided (accent-insensitive)
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      filteredResults = filteredResults.filter(
        (result) =>
          normalizeString(result.fullName).includes(searchNormalized) ||
          normalizeString(result.companyName).includes(searchNormalized)
      );
    }

    // Sort by person name
    filteredResults.sort((a, b) => a.fullName.localeCompare(b.fullName));

    return filteredResults;
  },
});
