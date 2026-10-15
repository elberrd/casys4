/**
 * Preview-only synthetic seed. Invoked from `scripts/vercel-build.sh` via
 * `convex deploy --preview-run` (the CLI ignores --preview-run on production).
 *
 * Creates one sign-in-able admin so Preview deployments are not empty. The
 * password is read from the Convex env var PREVIEW_SEED_PASSWORD (Preview
 * defaults) — never hardcoded. Optional PREVIEW_SEED_EMAIL defaults to a
 * non-production address.
 *
 * Refuses to run on the production Convex deployment even if invoked by hand.
 */
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Scrypt } from "lucia";

const PRODUCTION_CONVEX_HOST = "pleasant-mosquito-546.convex.cloud";
const DEFAULT_EMAIL = "preview-seed@casys4.dev";
const DEFAULT_FULL_NAME = "Preview Seed User";

function assertNotProduction(): void {
  const haystack = [
    process.env.CONVEX_CLOUD_URL ?? "",
    process.env.CONVEX_SITE_URL ?? "",
  ].join(" ");
  if (haystack.includes(PRODUCTION_CONVEX_HOST)) {
    throw new Error(
      "seedPreviewUser refuses to run on the production Convex deployment",
    );
  }
}

export const seed = internalMutation({
  args: {},
  returns: v.union(
    v.object({
      skipped: v.literal(true),
      reason: v.string(),
    }),
    v.object({
      alreadyExists: v.literal(true),
      profileId: v.id("userProfiles"),
    }),
    v.object({
      success: v.literal(true),
      profileId: v.id("userProfiles"),
      userId: v.id("users"),
    }),
  ),
  handler: async (ctx) => {
    assertNotProduction();

    const password = process.env.PREVIEW_SEED_PASSWORD;
    if (!password) {
      console.log(
        "seedPreviewUser: skipped — PREVIEW_SEED_PASSWORD is not set",
      );
      return {
        skipped: true as const,
        reason: "PREVIEW_SEED_PASSWORD is not set",
      };
    }
    if (password.length < 8) {
      throw new Error(
        "PREVIEW_SEED_PASSWORD must be at least 8 characters long",
      );
    }

    const email = process.env.PREVIEW_SEED_EMAIL || DEFAULT_EMAIL;
    const fullName = process.env.PREVIEW_SEED_FULL_NAME || DEFAULT_FULL_NAME;

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existingProfile) {
      return { alreadyExists: true as const, profileId: existingProfile._id };
    }

    const userId = await ctx.db.insert("users", {
      email,
      name: fullName,
    });

    const scrypt = new Scrypt();
    const hashedPassword = await scrypt.hash(password);
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: email,
      secret: hashedPassword,
    });

    const now = Date.now();
    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      email,
      fullName,
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true as const, profileId, userId };
  },
});
