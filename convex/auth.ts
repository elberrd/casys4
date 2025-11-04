import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  // TODO: Re-enable afterUserCreatedOrUpdated callback after fixing type issues
  // This callback should link pre-registered profiles or create new ones
  // callbacks: {
  //   async afterUserCreatedOrUpdated(ctx, { userId }) {
  //     const user = await ctx.db.get(userId);
  //     if (!user || !user.email) {
  //       console.warn("User created without email:", userId);
  //       return;
  //     }

  //     const email = user.email;

  //     const preRegisteredProfile = await ctx.db
  //       .query("userProfiles")
  //       .withIndex("by_email", (q) => q.eq("email", email))
  //       .first();

  //     if (preRegisteredProfile && !preRegisteredProfile.userId) {
  //       await ctx.db.patch(preRegisteredProfile._id, {
  //         userId: userId,
  //         isActive: true,
  //         updatedAt: Date.now(),
  //       });
  //       console.log(`Linked pre-registered profile ${preRegisteredProfile._id} to user ${userId}`);
  //     } else if (!preRegisteredProfile) {
  //       const now = Date.now();
  //       await ctx.db.insert("userProfiles", {
  //         userId: userId,
  //         email: email,
  //         fullName: user.name || email.split("@")[0],
  //         role: "client",
  //         companyId: undefined,
  //         phoneNumber: undefined,
  //         photoUrl: undefined,
  //         isActive: true,
  //         createdAt: now,
  //         updatedAt: now,
  //       });
  //       console.log(`Created new client profile for user ${userId}`);
  //     }
  //   },
  // },
});
