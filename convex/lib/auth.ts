import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";

/**
 * Get the current authenticated user's profile
 * Throws an error if not authenticated or if profile not found
 */
export async function getCurrentUserProfile(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"userProfiles">> {
  const userId = await getAuthUserId(ctx);

  if (userId === null) {
    throw new Error("Authentication required");
  }

  const userProfile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (!userProfile) {
    throw new Error(
      "User profile not found. Please contact an administrator to set up your profile."
    );
  }

  return userProfile;
}

/**
 * Verify that the current user has admin role
 * Throws an error if not authenticated or not an admin
 * Returns the admin user's profile
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"userProfiles">> {
  const userProfile = await getCurrentUserProfile(ctx);

  if (userProfile.role !== "admin") {
    throw new Error(
      "Access denied: This operation requires administrator privileges"
    );
  }

  return userProfile;
}

/**
 * Verify that the current user has client role
 * Throws an error if not authenticated, not a client, or missing companyId
 * Returns the client user's profile and their companyId
 */
export async function requireClient(
  ctx: QueryCtx | MutationCtx
): Promise<{
  profile: Doc<"userProfiles">;
  companyId: Id<"companies">;
}> {
  const userProfile = await getCurrentUserProfile(ctx);

  if (userProfile.role !== "client") {
    throw new Error("Access denied: This operation requires client role");
  }

  if (!userProfile.companyId) {
    throw new Error(
      "Invalid client profile: Missing company assignment. Please contact an administrator."
    );
  }

  return {
    profile: userProfile,
    companyId: userProfile.companyId,
  };
}

/**
 * Check if the current user can access data for a specific company
 * Admin users can access all companies
 * Client users can only access their own company
 */
export async function canAccessCompany(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<"companies">
): Promise<boolean> {
  const userProfile = await getCurrentUserProfile(ctx);

  // Admin users have full access
  if (userProfile.role === "admin") {
    return true;
  }

  // Client users can only access their own company
  if (userProfile.role === "client") {
    return userProfile.companyId === companyId;
  }

  return false;
}

/**
 * Require that the current user can access data for a specific company
 * Throws an error if access is denied
 * Returns the user's profile
 */
export async function requireCompanyAccess(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<"companies">
): Promise<Doc<"userProfiles">> {
  const userProfile = await getCurrentUserProfile(ctx);

  const hasAccess = await canAccessCompany(ctx, companyId);

  if (!hasAccess) {
    throw new Error(
      "Access denied: You do not have permission to access this company's data"
    );
  }

  return userProfile;
}
