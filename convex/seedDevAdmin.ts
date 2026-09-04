/**
 * Seed a working admin account for local / Cloud Agent development.
 *
 * This is an internalMutation, so it can only be invoked with deploy access
 * (e.g. `convex run seedDevAdmin '{...}'`) — never by application clients.
 * It creates the auth user, a password auth account (hashed with the same
 * Scrypt algorithm the @convex-dev/auth Password provider uses), and an admin
 * userProfile, so the account can sign in immediately. Idempotent: if a profile
 * with the given email already exists, it is left untouched.
 *
 * Used by the Cloud Agent bootstrap in .cursor/install.sh so authenticated
 * flows work on a fresh, from-scratch local anonymous Convex deployment.
 */
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Scrypt } from "lucia";

export default internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existingProfile) {
      return { alreadyExists: true, profileId: existingProfile._id };
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.fullName,
    });

    const scrypt = new Scrypt();
    const hashedPassword = await scrypt.hash(args.password);
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: args.email,
      secret: hashedPassword,
    });

    const now = Date.now();
    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      email: args.email,
      fullName: args.fullName,
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, profileId, userId };
  },
});
