import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      if (!user || !user.email) {
        console.warn("User created without email:", userId);
        return;
      }

      const email = user.email as string;

      // Check if there's a pre-registered profile for this email
      const profiles = await ctx.db
        .query("userProfiles")
        .collect();

      const preRegisteredProfile = profiles.find(
        (p: any) => p.email === email && !p.userId
      );

      if (preRegisteredProfile && !preRegisteredProfile.userId) {
        // Link the pre-registered profile to the newly authenticated user
        await ctx.db.patch(preRegisteredProfile._id, {
          userId: userId,
          isActive: true,
          updatedAt: Date.now(),
        });
        console.log(`Linked pre-registered profile ${preRegisteredProfile._id} to user ${userId}`);
      } else if (!preRegisteredProfile) {
        // Create a new profile for users who weren't pre-registered
        const now = Date.now();
        await ctx.db.insert("userProfiles", {
          userId: userId,
          email: email,
          fullName: (user as any).name || email.split("@")[0],
          role: "client",
          companyId: undefined,
          phoneNumber: undefined,
          photoUrl: undefined,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        console.log(`Created new client profile for user ${userId}`);
      }
    },
  },
});
