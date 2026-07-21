import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/**
 * Record the OCR result that people.create must consume for this exact upload.
 * This is internal so clients cannot forge a passport number for a storage ID.
 */
export const record = internalMutation({
  args: {
    storageId: v.id("_storage"),
    passportNumber: v.union(v.string(), v.null()),
    verifiedBy: v.id("users"),
  },
  returns: v.union(v.id("personPassportOcrVerifications"), v.null()),
  handler: async (ctx, args) => {
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) return null;

    const existing = await ctx.db
      .query("personPassportOcrVerifications")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
    const passportNumber = args.passportNumber?.trim() || null;

    if (existing) {
      await ctx.db.patch(existing._id, {
        passportNumber,
        verifiedBy: args.verifiedBy,
        verifiedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("personPassportOcrVerifications", {
      storageId: args.storageId,
      passportNumber,
      verifiedBy: args.verifiedBy,
      verifiedAt: Date.now(),
    });
  },
});
