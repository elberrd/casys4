import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile } from "./lib/auth";
import { logActivitySafely } from "./lib/activityLogger";

/**
 * Generate a short-lived upload URL for the candidate passport file.
 * Available to any authenticated user (clients upload during the request wizard).
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create or link the candidate person + passport from (OCR-extracted, possibly
 * user-edited) passport data. Client-permitted, scoped to the request flow.
 *
 * - mode "new": creates a person and a passport linked to it.
 * - mode "existing": uses the given personId; optionally fills missing person
 *   fields; links/creates the passport.
 *
 * Returns the resolved { personId, passportId }.
 */
export const applyCandidate = mutation({
  args: {
    mode: v.union(v.literal("existing"), v.literal("new")),
    personId: v.optional(v.id("people")),
    fillGaps: v.optional(v.boolean()),
    // Person fields
    givenNames: v.optional(v.string()),
    middleName: v.optional(v.string()),
    surname: v.optional(v.string()),
    sex: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    nationalityId: v.optional(v.id("countries")),
    // Passport fields
    passportNumber: v.string(),
    issuingCountryId: v.optional(v.id("countries")),
    issueDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentUserProfile(ctx);
    const now = Date.now();

    const passportNumber = args.passportNumber.trim();
    if (!passportNumber) {
      throw new Error("Passport number is required");
    }

    // --- Resolve the person ---
    let personId: Id<"people">;
    if (args.mode === "existing") {
      if (!args.personId) {
        throw new Error("personId is required when using an existing candidate");
      }
      personId = args.personId;
      const person = await ctx.db.get(personId);
      if (!person) throw new Error("Person not found");

      // Per product decision, a client may reuse ANY existing person matched by
      // exact name (cross-tenant dedup). PII is protected by fillGaps below,
      // which only fills empty fields and never overwrites existing values.

      if (args.fillGaps) {
        const patch: Record<string, unknown> = {};
        if (!person.middleName && args.middleName) patch.middleName = args.middleName;
        if (!person.surname && args.surname) patch.surname = args.surname;
        if (!person.sex && args.sex) patch.sex = args.sex;
        if (!person.birthDate && args.birthDate) patch.birthDate = args.birthDate;
        if (!person.nationalityId && args.nationalityId)
          patch.nationalityId = args.nationalityId;
        if (Object.keys(patch).length > 0) {
          patch.updatedAt = now;
          await ctx.db.patch(personId, patch);
        }
      }
    } else {
      if (!args.givenNames || !args.givenNames.trim()) {
        throw new Error("givenNames is required to create a new candidate");
      }
      personId = await ctx.db.insert("people", {
        givenNames: args.givenNames.trim(),
        middleName: args.middleName,
        surname: args.surname,
        sex: args.sex,
        birthDate: args.birthDate,
        nationalityId: args.nationalityId,
        createdBy: profile.userId,
        createdAt: now,
        updatedAt: now,
      });
      await logActivitySafely(ctx, {
        userId: profile.userId,
        action: "created",
        entityType: "person",
        entityId: personId,
        details: {
          fullName: [args.givenNames, args.middleName, args.surname]
            .filter(Boolean)
            .join(" "),
          via: "processRequestPassport",
        },
      });
    }

    // --- Resolve the passport (link existing by number, or create) ---
    let passportId: Id<"passports">;
    const existingPassport = await ctx.db
      .query("passports")
      .withIndex("by_passportNumber", (q) =>
        q.eq("passportNumber", passportNumber)
      )
      .first();

    if (existingPassport) {
      passportId = existingPassport._id;
      const patch: Record<string, unknown> = { updatedAt: now };
      if (!existingPassport.personId) patch.personId = personId;
      if (args.storageId && !existingPassport.storageId)
        patch.storageId = args.storageId;
      if (!existingPassport.issuingCountryId && args.issuingCountryId)
        patch.issuingCountryId = args.issuingCountryId;
      if (!existingPassport.issueDate && args.issueDate)
        patch.issueDate = args.issueDate;
      if (!existingPassport.expiryDate && args.expiryDate)
        patch.expiryDate = args.expiryDate;
      await ctx.db.patch(passportId, patch);
    } else {
      // Single-active-passport rule: deactivate other active passports.
      const activePassports = await ctx.db
        .query("passports")
        .withIndex("by_person", (q) => q.eq("personId", personId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      await Promise.all(
        activePassports.map((p) =>
          ctx.db.patch(p._id, { isActive: false, updatedAt: now })
        )
      );

      passportId = await ctx.db.insert("passports", {
        personId,
        passportNumber,
        issuingCountryId: args.issuingCountryId,
        issueDate: args.issueDate,
        expiryDate: args.expiryDate,
        storageId: args.storageId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      await logActivitySafely(ctx, {
        userId: profile.userId,
        action: "created",
        entityType: "passport",
        entityId: passportId,
        details: { passportNumber, via: "processRequestPassport" },
      });
    }

    return { personId, passportId };
  },
});
