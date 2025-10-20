/**
 * Seed script to create initial admin user
 * This is an internal mutation that bypasses authentication
 *
 * To run this script:
 * npx convex run userProfiles:seedAdminUser '{"userId":"jx7462j2he9wfan2s84badcjd17smh4b","email":"elber@impactus.ai","fullName":"Elber Rodriguez"}'
 */

import { internalMutation } from "./_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    // This script creates an admin profile for the existing user
    const userId = "jx7462j2he9wfan2s84badcjd17smh4b" as any;
    const email = "elber@impactus.ai";
    const fullName = "Elber Rodriguez";

    // Check if user profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      console.log("User profile already exists:", existingProfile._id);
      return { alreadyExists: true, profileId: existingProfile._id };
    }

    // Check email uniqueness
    const existingEmail = await ctx.db
      .query("userProfiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingEmail) {
      console.log("Email already in use by:", existingEmail._id);
      return { error: "Email already exists", existingProfileId: existingEmail._id };
    }

    const now = Date.now();

    const userProfileId = await ctx.db.insert("userProfiles", {
      userId,
      email,
      fullName,
      role: "admin",
      companyId: undefined,
      phoneNumber: undefined,
      photoUrl: undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    console.log("✅ Admin user profile created:", userProfileId);
    return { success: true, profileId: userProfileId };
  },
});
