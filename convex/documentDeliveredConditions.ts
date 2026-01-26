import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile } from "./lib/auth";

/**
 * Query to list all conditions for a delivered document
 */
export const listByDocument = query({
  args: { documentsDeliveredId: v.id("documentsDelivered") },
  handler: async (ctx, args) => {
    const conditions = await ctx.db
      .query("documentDeliveredConditions")
      .withIndex("by_documentDelivered", (q) =>
        q.eq("documentsDeliveredId", args.documentsDeliveredId)
      )
      .collect();

    const now = Date.now();

    // Enrich with condition definition and user data
    const enrichedConditions = await Promise.all(
      conditions.map(async (condition) => {
        const conditionDef = await ctx.db.get(
          condition.documentTypeConditionId
        );

        let fulfilledByUser = null;
        if (condition.fulfilledBy) {
          const userProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", condition.fulfilledBy))
            .first();
          fulfilledByUser = userProfile
            ? {
                _id: userProfile._id,
                fullName: userProfile.fullName,
                email: userProfile.email,
              }
            : null;
        }

        // Calculate expiration status
        const isExpired = condition.expiresAt
          ? condition.expiresAt < now
          : false;

        return {
          ...condition,
          conditionDefinition: conditionDef
            ? {
                _id: conditionDef._id,
                name: conditionDef.name,
                code: conditionDef.code,
                description: conditionDef.description,
                isRequired: conditionDef.isRequired,
                relativeExpirationDays: conditionDef.relativeExpirationDays,
              }
            : null,
          fulfilledByUser,
          isExpired,
        };
      })
    );

    // Sort by required first, then by name
    return enrichedConditions.sort((a, b) => {
      // Required conditions first
      const aRequired = a.conditionDefinition?.isRequired ?? false;
      const bRequired = b.conditionDefinition?.isRequired ?? false;
      if (aRequired !== bRequired) {
        return bRequired ? 1 : -1;
      }
      // Then by name
      const aName = a.conditionDefinition?.name ?? "";
      const bName = b.conditionDefinition?.name ?? "";
      return aName.localeCompare(bName);
    });
  },
});

/**
 * Query to get validation status for a document
 * Returns whether all required conditions are fulfilled and if any are expired
 */
export const getValidationStatus = query({
  args: { documentsDeliveredId: v.id("documentsDelivered") },
  handler: async (ctx, args) => {
    const conditions = await ctx.db
      .query("documentDeliveredConditions")
      .withIndex("by_documentDelivered", (q) =>
        q.eq("documentsDeliveredId", args.documentsDeliveredId)
      )
      .collect();

    const now = Date.now();

    const unfulfilledRequired: string[] = [];
    const expiredConditions: string[] = [];

    for (const condition of conditions) {
      const conditionDef = await ctx.db.get(condition.documentTypeConditionId);
      if (!conditionDef) continue;

      // Check if required and not fulfilled
      if (conditionDef.isRequired && !condition.isFulfilled) {
        unfulfilledRequired.push(conditionDef.name);
      }

      // Check if expired
      if (condition.expiresAt && condition.expiresAt < now) {
        expiredConditions.push(conditionDef.name);
      }
    }

    return {
      allRequiredFulfilled: unfulfilledRequired.length === 0,
      hasExpiredConditions: expiredConditions.length > 0,
      unfulfilledRequired,
      expiredConditions,
      totalConditions: conditions.length,
      fulfilledCount: conditions.filter((c) => c.isFulfilled).length,
    };
  },
});

/**
 * Mutation to toggle fulfillment status of a condition
 */
export const toggleFulfillment = mutation({
  args: {
    id: v.id("documentDeliveredConditions"),
    isFulfilled: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    if (!userProfile?.userId) {
      throw new Error("User must be authenticated");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Condition not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.id, {
      isFulfilled: args.isFulfilled,
      fulfilledAt: args.isFulfilled ? now : undefined,
      fulfilledBy: args.isFulfilled ? userProfile.userId : undefined,
      notes: args.notes ?? existing.notes,
    });

    return args.id;
  },
});

/**
 * Internal mutation to auto-create conditions for a delivered document
 * Called when a document is uploaded
 * Uses the documentTypeConditionLinks junction table to find linked conditions
 */
export const autoCreateForDocument = internalMutation({
  args: {
    documentsDeliveredId: v.id("documentsDelivered"),
    documentTypeId: v.id("documentTypes"),
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    // Get the individual process to retrieve createdAt for expiration calculation
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      // If process not found, skip condition creation (edge case)
      return [];
    }

    // Get all links for this document type
    const links = await ctx.db
      .query("documentTypeConditionLinks")
      .withIndex("by_documentType", (q) =>
        q.eq("documentTypeId", args.documentTypeId)
      )
      .collect();

    if (links.length === 0) {
      return [];
    }

    const now = Date.now();
    const createdIds: Id<"documentDeliveredConditions">[] = [];

    for (const link of links) {
      // Get the condition data
      const condition = await ctx.db.get(link.documentTypeConditionId);
      if (!condition || !condition.isActive) {
        continue;
      }

      // Calculate expiration date if relativeExpirationDays is set
      let expiresAt: number | undefined;
      if (condition.relativeExpirationDays) {
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        expiresAt =
          individualProcess.createdAt +
          condition.relativeExpirationDays * millisecondsPerDay;
      }

      const conditionId = await ctx.db.insert("documentDeliveredConditions", {
        documentsDeliveredId: args.documentsDeliveredId,
        documentTypeConditionId: condition._id,
        isFulfilled: false,
        expiresAt,
        createdAt: now,
      });

      createdIds.push(conditionId);
    }

    return createdIds;
  },
});

/**
 * Query to check if a document has any conditions defined
 */
export const hasConditions = query({
  args: { documentsDeliveredId: v.id("documentsDelivered") },
  handler: async (ctx, args) => {
    const condition = await ctx.db
      .query("documentDeliveredConditions")
      .withIndex("by_documentDelivered", (q) =>
        q.eq("documentsDeliveredId", args.documentsDeliveredId)
      )
      .first();

    return condition !== null;
  },
});
