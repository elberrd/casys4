import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getClientCurrentCompanyIds, getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { buildChangedFields, logActivitySafely } from "./lib/activityLogger";
import { normalizeString } from "./lib/stringUtils";
import { cleanDocumentNumber } from "../lib/utils/document-masks";
import { createCachedGet } from "./lib/cachedGet";
import {
  normalizePersonPassportFileName,
  validatePersonPassportUpload,
} from "./lib/personPassportAttachment";

/** Constructs full display name from person name parts */
function getFullName(person: { givenNames: string; middleName?: string; surname?: string }): string {
  return [person.givenNames, person.middleName, person.surname].filter(Boolean).join(" ");
}

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

    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    let people = await ctx.db.query("people").collect();

    // Apply role-based access control via peopleCompanies relationship
    if (userProfile.role === "client") {
      const currentCompanyIds = await getClientCurrentCompanyIds(ctx, userProfile);
      if (currentCompanyIds.size === 0) {
        throw new Error("Client user must have a current company assignment");
      }

      const companyPeople = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
        .collect();

      const allowedPersonIds = new Set(
        companyPeople
          .filter((pc) => pc.companyId && currentCompanyIds.has(pc.companyId))
          .map((pc) => pc.personId)
      );

      // Filter to only people associated with client's company
      people = people.filter((person) => allowedPersonIds.has(person._id));
    }

    // Filter by search query if provided (accent-insensitive)
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      people = people.filter(
        (person) =>
          normalizeString(getFullName(person)).includes(searchNormalized) ||
          (person.email && normalizeString(person.email).includes(searchNormalized)) ||
          (person.cpf && person.cpf.includes(searchNormalized))
      );
    }

    // Fetch related data for each person
    const peopleWithRelations = await Promise.all(
      people.map(async (person) => {
        const birthCity = person.birthCityId
          ? await cachedGet(person.birthCityId)
          : null;
        const birthState = birthCity?.stateId
          ? await cachedGet(birthCity.stateId)
          : null;
        const currentCity = person.currentCityId
          ? await cachedGet(person.currentCityId)
          : null;
        const currentState = currentCity?.stateId
          ? await cachedGet(currentCity.stateId)
          : null;
        const nationality = person.nationalityId
          ? await cachedGet(person.nationalityId)
          : null;

        // Get current company for the person
        const personCompany = await ctx.db
          .query("peopleCompanies")
          .withIndex("by_person", (q) => q.eq("personId", person._id))
          .filter((q) => q.eq(q.field("isCurrent"), true))
          .first();

        const company = personCompany?.companyId
          ? await cachedGet(personCompany.companyId)
          : null;

        return {
          ...person,
          fullName: getFullName(person),
          birthCity,
          birthState,
          currentCity,
          currentState,
          nationality,
          company,
          companyEmail: personCompany?.email ?? null,
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

    let people = await ctx.db.query("people").collect();

    // Apply role-based access control
    if (userProfile.role === "client") {
      const currentCompanyIds = await getClientCurrentCompanyIds(ctx, userProfile);
      if (currentCompanyIds.size === 0) {
        throw new Error("Client user must have a current company assignment");
      }

      const companyPeople = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
        .collect();

      const allowedPersonIds = new Set(
        companyPeople
          .filter((pc) => pc.companyId && currentCompanyIds.has(pc.companyId))
          .map((pc) => pc.personId)
      );
      people = people.filter((person) => allowedPersonIds.has(person._id));
    }

    // Accent-insensitive search
    const queryNormalized = normalizeString(args.query);
    return people
      .filter(
        (person) =>
          normalizeString(getFullName(person)).includes(queryNormalized) ||
          (person.email && normalizeString(person.email).includes(queryNormalized)) ||
          (person.cpf && person.cpf.includes(queryNormalized))
      )
      .slice(0, 10) // Limit to 10 results for performance
      .map((person) => ({ ...person, fullName: getFullName(person) }));
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

    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // For clients, verify they can only access their own company
    if (userProfile.role === "client") {
      const currentCompanyIds = await getClientCurrentCompanyIds(ctx, userProfile);
      if (!currentCompanyIds.has(args.companyId)) {
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
        const person = await cachedGet(pc.personId);
        return person;
      })
    );

    // Filter out null values and return with computed fullName
    return people
      .filter((person): person is NonNullable<typeof person> => person !== null)
      .map((person) => ({ ...person, fullName: getFullName(person) }));
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
    await getCurrentUserProfile(ctx);

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
        fullName: getFullName(existingPerson),
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
      const currentCompanyIds = await getClientCurrentCompanyIds(ctx, userProfile);
      if (currentCompanyIds.size === 0) {
        throw new Error("Client user must have a current company assignment");
      }

      const personCompanies = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_person", (q) => q.eq("personId", id))
        .collect();

      const hasCurrentCompanyAccess = personCompanies.some(
        (pc) => pc.isCurrent && pc.companyId && currentCompanyIds.has(pc.companyId)
      );

      if (!hasCurrentCompanyAccess) {
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
      fullName: getFullName(person),
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
    givenNames: v.string(),
    middleName: v.optional(v.string()),
    surname: v.optional(v.string()),
    email: v.optional(v.string()),
    cpf: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    birthCityId: v.optional(v.id("cities")),
    nationalityId: v.optional(v.id("countries")),
    sex: v.optional(v.string()),
    maritalStatus: v.optional(v.string()),
    profession: v.optional(v.string()),
    cargo: v.optional(v.string()),
    motherName: v.optional(v.string()),
    fatherName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    currentCityId: v.optional(v.id("cities")),
    residenceSince: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    passportAttachment: v.optional(
      v.object({
        storageId: v.id("_storage"),
        fileName: v.string(),
      }),
    ),
  },
  returns: v.id("people"),
  handler: async (ctx, args) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

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
            `CPF ${args.cpf} is already registered to ${getFullName(existingPerson)}`
          );
        }
      }
    }

    const { passportAttachment, ...personData } = args;
    const attachmentMetadata = passportAttachment
      ? await validatePersonPassportUpload(ctx, passportAttachment.storageId)
      : null;
    const attachmentFileName = passportAttachment
      ? normalizePersonPassportFileName(passportAttachment.fileName)
      : null;
    if (passportAttachment && !adminProfile.userId) {
      throw new Error("Administrator profile is not activated");
    }
    const passportVerification = passportAttachment
      ? await ctx.db
          .query("personPassportOcrVerifications")
          .withIndex("by_storageId", (q) =>
            q.eq("storageId", passportAttachment.storageId),
          )
          .first()
      : null;
    if (
      passportAttachment &&
      (!passportVerification ||
        !adminProfile.userId ||
        passportVerification.verifiedBy !== adminProfile.userId ||
        !passportVerification.passportNumber)
    ) {
      throw new ConvexError({ code: "PASSPORT_VERIFICATION_REQUIRED" });
    }
    const verifiedPassportNumber = passportVerification?.passportNumber;
    if (verifiedPassportNumber) {
      const existingPassport = await ctx.db
        .query("passports")
        .withIndex("by_passportNumber", (q) =>
          q.eq("passportNumber", verifiedPassportNumber),
        )
        .first();
      if (existingPassport?.personId) {
        const existingPerson = await ctx.db.get(existingPassport.personId);
        throw new ConvexError({
          code: "PASSPORT_ALREADY_LINKED",
          passportNumber: existingPassport.passportNumber,
          personId: existingPassport.personId,
          personName: existingPerson
            ? getFullName(existingPerson)
            : "Pessoa existente",
        });
      }
    }
    if (passportAttachment) {
      const storageOwner = await ctx.db
        .query("personPassportAttachments")
        .withIndex("by_storageId", (q) =>
          q.eq("storageId", passportAttachment.storageId),
        )
        .first();
      if (storageOwner) {
        throw new Error("Uploaded passport is already attached to a person");
      }
    }

    const now = Date.now();

    const personId = await ctx.db.insert("people", {
      ...personData,
      createdAt: now,
      updatedAt: now,
    });

    if (
      passportAttachment &&
      attachmentMetadata &&
      attachmentFileName &&
      adminProfile.userId
    ) {
      await ctx.db.insert("personPassportAttachments", {
        personId,
        storageId: passportAttachment.storageId,
        fileName: attachmentFileName,
        mimeType: attachmentMetadata.mimeType,
        fileSize: attachmentMetadata.fileSize,
        createdAt: now,
        updatedAt: now,
        createdBy: adminProfile.userId,
      });
      if (passportVerification) {
        await ctx.db.delete(passportVerification._id);
      }
    }

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "created",
      entityType: "person",
      entityId: personId,
      details: {
        fullName: getFullName(personData),
        cpf: personData.cpf,
        email: personData.email,
        passportAttachment: attachmentFileName ?? undefined,
      },
    });

    return personId;
  },
});

/**
 * Find people whose full name matches the given name (accent/case-insensitive,
 * exact match on the normalized full name). Used by passport OCR autofill to
 * detect whether a candidate already exists before creating a new person.
 */
export const findByNormalizedName = query({
  args: { fullName: v.string() },
  handler: async (ctx, { fullName }) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const target = normalizeString(fullName.trim());
    if (!target) return [];

    const all = await ctx.db.query("people").collect();
    const matches = all.filter(
      (p) => normalizeString(getFullName(p)) === target
    );

    // A client may dedup-link against ANY exact-name match, but the FULL PII
    // record (CPF, e-mail, filiação, birth date) is disclosed only for people
    // they own (own candidate / own company). For cross-tenant matches we return
    // the minimum needed to recognize and link the person: name + birth year.
    const isPrivileged = userProfile.role !== "client";
    const currentCompanyIds: Set<Id<"companies">> = isPrivileged
      ? new Set()
      : await getClientCurrentCompanyIds(ctx, userProfile);

    return Promise.all(
      matches.map(async (p) => {
        let owned = isPrivileged;
        if (!owned) {
          if (p.createdBy && p.createdBy === userProfile.userId) {
            owned = true;
          } else {
            const links = await ctx.db
              .query("peopleCompanies")
              .withIndex("by_person", (q) => q.eq("personId", p._id))
              .collect();
            owned = links.some(
              (l) =>
                l.isCurrent &&
                l.companyId &&
                currentCompanyIds.has(l.companyId)
            );
          }
        }
        const birthYear = p.birthDate ? p.birthDate.slice(0, 4) : null;

        return {
          _id: p._id,
          fullName: getFullName(p),
          owned,
          givenNames: p.givenNames,
          middleName: p.middleName ?? null,
          surname: p.surname ?? null,
          birthYear,
          // Sensitive fields only for people the caller owns.
          cpf: owned ? (p.cpf ?? null) : null,
          birthDate: owned ? (p.birthDate ?? null) : null,
          email: owned ? (p.email ?? null) : null,
          sex: owned ? (p.sex ?? null) : null,
          maritalStatus: owned ? (p.maritalStatus ?? null) : null,
          fatherName: owned ? (p.fatherName ?? null) : null,
          motherName: owned ? (p.motherName ?? null) : null,
          nationalityId: owned ? (p.nationalityId ?? null) : null,
        };
      })
    );
  },
});

/**
 * Mutation to update a person (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("people"),
    givenNames: v.string(),
    middleName: v.optional(v.string()),
    surname: v.optional(v.string()),
    email: v.optional(v.string()),
    cpf: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    birthCityId: v.optional(v.id("cities")),
    nationalityId: v.optional(v.id("countries")),
    sex: v.optional(v.string()),
    maritalStatus: v.optional(v.string()),
    profession: v.optional(v.string()),
    cargo: v.optional(v.string()),
    motherName: v.optional(v.string()),
    fatherName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    currentCityId: v.optional(v.id("cities")),
    residenceSince: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("people"),
  handler: async (ctx, args) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);

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
            `CPF ${data.cpf} is already registered to ${getFullName(existingPerson)}`
          );
        }
      }
    }

    // Get current document to preserve system fields
    const current = await ctx.db.get(id);
    if (!current) {
      throw new Error("Person not found");
    }

    // Build a typed replacement. Optional values omitted here are removed,
    // while immutable creation ownership is preserved.
    const replacement: Omit<Doc<"people">, "_id" | "_creationTime"> = {
      createdAt: current.createdAt,
      givenNames: data.givenNames,
      updatedAt: Date.now(),
      ...(current.createdBy ? { createdBy: current.createdBy } : {}),
      ...(data.middleName ? { middleName: data.middleName } : {}),
      ...(data.surname ? { surname: data.surname } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.cpf ? { cpf: data.cpf } : {}),
      ...(data.birthDate ? { birthDate: data.birthDate } : {}),
      ...(data.birthCityId ? { birthCityId: data.birthCityId } : {}),
      ...(data.nationalityId ? { nationalityId: data.nationalityId } : {}),
      ...(data.sex ? { sex: data.sex } : {}),
      ...(data.maritalStatus ? { maritalStatus: data.maritalStatus } : {}),
      ...(data.profession ? { profession: data.profession } : {}),
      ...(data.cargo ? { cargo: data.cargo } : {}),
      ...(data.motherName ? { motherName: data.motherName } : {}),
      ...(data.fatherName ? { fatherName: data.fatherName } : {}),
      ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}),
      ...(data.address ? { address: data.address } : {}),
      ...(data.currentCityId ? { currentCityId: data.currentCityId } : {}),
      ...(data.residenceSince ? { residenceSince: data.residenceSince } : {}),
      ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
    };

    await ctx.db.replace(id, replacement);

    const changes = buildChangedFields(
      {
        givenNames: current.givenNames,
        middleName: current.middleName,
        surname: current.surname,
        cpf: current.cpf,
        email: current.email,
        birthDate: current.birthDate,
        phoneNumber: current.phoneNumber,
        profession: current.profession,
      },
      {
        givenNames: replacement.givenNames,
        middleName: replacement.middleName,
        surname: replacement.surname,
        cpf: replacement.cpf,
        email: replacement.email,
        birthDate: replacement.birthDate,
        phoneNumber: replacement.phoneNumber,
        profession: replacement.profession,
      }
    );

    if (Object.keys(changes).length > 0) {
      await logActivitySafely(ctx, {
        userId: adminProfile.userId,
        action: "updated",
        entityType: "person",
        entityId: id,
        details: {
          fullName: getFullName(current),
          changes,
        },
      });
    }

    return id;
  },
});

/**
 * Mutation to delete a person (admin only)
 */
export const remove = mutation({
  args: { id: v.id("people") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    // Require admin role
    const adminProfile = await requireAdmin(ctx);
    const person = await ctx.db.get(id);
    if (!person) {
      throw new Error("Person not found");
    }

    // Check if there are individual processes associated with this person.
    // Client-request drafts don't count as real processes here.
    const individualProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_person", (q) => q.eq("personId", id))
      .filter((q) => q.neq(q.field("requestStatus"), "draft"))
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

    const passportAttachment = await ctx.db
      .query("personPassportAttachments")
      .withIndex("by_person", (q) => q.eq("personId", id))
      .first();

    if (passportAttachment) {
      await ctx.db.delete(passportAttachment._id);
      await ctx.storage.delete(passportAttachment.storageId);
    }

    await ctx.db.delete(id);

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "deleted",
      entityType: "person",
      entityId: id,
      details: {
        fullName: getFullName(person),
        cpf: person.cpf,
        email: person.email,
        passportAttachment: passportAttachment?.fileName,
      },
    });
    return null;
  },
});

/**
 * Query to list people eligible for client user creation
 * Filters: has current company (isCurrent=true), has email, does NOT have existing userProfile
 * Returns: personId, fullName, companyId, companyName, email, role (cargo)
 * Admin only
 */
export const listEligibleForClientUser = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Get all current people-company relationships
    const peopleCompanies = await ctx.db
      .query("peopleCompanies")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .collect();

    // Get all existing userProfile emails to exclude
    const existingProfiles = await ctx.db.query("userProfiles").collect();
    const existingEmails = new Set(
      existingProfiles.map((p) => p.email.toLowerCase())
    );

    // Build results
    const results = await Promise.all(
      peopleCompanies.map(async (pc) => {
        if (!pc.personId || !pc.companyId) return null;

        const person = await cachedGet(pc.personId);
        const company = await cachedGet(pc.companyId);

        if (!person || !company) return null;

        // Determine email: prefer peopleCompanies.email, fallback to people.email
        const email = pc.email || person.email;
        if (!email) return null;

        // Exclude if already has a userProfile
        if (existingEmails.has(email.toLowerCase())) return null;

        return {
          personId: person._id,
          fullName: getFullName(person),
          companyId: company._id,
          companyName: company.name,
          email,
          role: pc.role,
        };
      })
    );

    return results
      .filter((r) => r !== null)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
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

    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Get all people-company relationships where isCurrent=true
    let peopleCompanies = await ctx.db
      .query("peopleCompanies")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .collect();

    // Apply role-based access control for client users
    if (userProfile.role === "client") {
      const currentCompanyIds = await getClientCurrentCompanyIds(ctx, userProfile);
      if (currentCompanyIds.size === 0) {
        throw new Error("Client user must have a current company assignment");
      }

      peopleCompanies = peopleCompanies.filter(
        (pc) => pc.companyId && currentCompanyIds.has(pc.companyId)
      );
    }

    // Build result with person and company information
    const results = await Promise.all(
      peopleCompanies.map(async (pc) => {
        if (!pc.personId || !pc.companyId) return null;

        const person = await cachedGet(pc.personId);
        const company = await cachedGet(pc.companyId);

        if (!person || !company) return null;

        return {
          _id: person._id,
          fullName: getFullName(person),
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
