import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

export const list = query({
  args: {
    personId: v.optional(v.id("people")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let passports = await ctx.db.query("passports").collect();

    if (args.personId !== undefined) {
      passports = passports.filter((p) => p.personId === args.personId);
    }

    if (args.isActive !== undefined) {
      passports = passports.filter((p) => p.isActive === args.isActive);
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

export const listByPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, args) => {
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

export const get = query({
  args: { id: v.id("passports") },
  handler: async (ctx, args) => {
    const passport = await ctx.db.get(args.id);
    if (!passport) return null;

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
    const { id, ...updateData } = args;

    await ctx.db.patch(id, {
      ...updateData,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("passports") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
