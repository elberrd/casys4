import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";

/**
 * Get the current authenticated user's profile
 * Throws an error if not authenticated or if profile not found
 *
 * IMPORTANT: The returned userProfile.userId may be undefined for pre-registered users
 * who have not yet been activated. Always check if userProfile.userId exists before
 * using it in queries that require a valid userId.
 *
 * For mutations that require an activated user, consider using requireActiveUserProfile() instead.
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
 * Get the current authenticated user's profile and require that it's activated
 * Throws an error if not authenticated, profile not found, or profile is not activated
 *
 * Use this helper in mutations or queries that require an activated user with a valid userId.
 * The returned profile is guaranteed to have a non-null userId property.
 */
export async function requireActiveUserProfile(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"userProfiles"> & { userId: Id<"users"> }> {
  const userProfile = await getCurrentUserProfile(ctx);

  if (!userProfile.userId) {
    throw new Error(
      "User profile not activated. Please contact an administrator to complete your account setup."
    );
  }

  return userProfile as Doc<"userProfiles"> & { userId: Id<"users"> };
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
 * Verify that the current user has client role and a current company.
 *
 * `peopleCompanies.isCurrent` is the source of truth for linked client users;
 * `userProfiles.companyId` is kept as a legacy fallback for profiles without a
 * linked person.
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

  const currentCompanyIds = await getClientCurrentCompanyIds(ctx, userProfile);
  const companyId = currentCompanyIds.values().next().value;

  if (!companyId) {
    throw new Error(
      "Invalid client profile: Missing current company assignment. Please contact an administrator."
    );
  }

  return {
    profile: userProfile,
    companyId,
  };
}

/**
 * Resolve the set of company IDs a client user is currently assigned to.
 *
 * Source of truth: `peopleCompanies.isCurrent === true` for the user's `personId`.
 * A person can have history of multiple company affiliations, but only the ones
 * flagged `isCurrent` should drive access — clients must not see processes from
 * past employers.
 *
 * Falls back to `userProfile.companyId` if the profile has no linked person or
 * no current peopleCompanies records (legacy / pre-personId profiles).
 *
 * Returns an empty set if no current company can be resolved.
 */
export async function getClientCurrentCompanyIds(
  ctx: QueryCtx | MutationCtx,
  userProfile: Doc<"userProfiles">
): Promise<Set<Id<"companies">>> {
  const companyIds = new Set<Id<"companies">>();

  if (userProfile.personId) {
    const personId = userProfile.personId;
    const peopleCompanies = await ctx.db
      .query("peopleCompanies")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .collect();

    for (const pc of peopleCompanies) {
      if (pc.isCurrent && pc.companyId) {
        companyIds.add(pc.companyId);
      }
    }
  }

  if (companyIds.size === 0 && userProfile.companyId) {
    companyIds.add(userProfile.companyId);
  }

  return companyIds;
}

/**
 * Resolve the set of company IDs associated with an individual process:
 * companyApplicantId, userApplicantCompanyId, and the collective process's
 * companyId (if any). Returns the set used to check client access.
 */
export async function getIndividualProcessCompanyIds(
  ctx: QueryCtx | MutationCtx,
  process: Doc<"individualProcesses">
): Promise<Set<Id<"companies">>> {
  const ids = new Set<Id<"companies">>();
  if (process.companyApplicantId) ids.add(process.companyApplicantId);
  if (process.userApplicantCompanyId) ids.add(process.userApplicantCompanyId);
  if (process.collectiveProcessId) {
    const cp = await ctx.db.get(process.collectiveProcessId);
    if (cp?.companyId) ids.add(cp.companyId);
  }
  return ids;
}

/**
 * Enforce that a client user can access an individual process. Throws if
 * the user is a client and none of the process's company associations
 * (companyApplicantId, userApplicantCompanyId, or collectiveProcess.companyId)
 * matches one of the user's CURRENT company assignments. Admins always pass.
 */
export async function requireClientCanAccessProcess(
  ctx: QueryCtx | MutationCtx,
  userProfile: Doc<"userProfiles">,
  process: Doc<"individualProcesses">
): Promise<void> {
  if (userProfile.role !== "client") return;

  const [currentCompanyIds, processCompanyIds] = await Promise.all([
    getClientCurrentCompanyIds(ctx, userProfile),
    getIndividualProcessCompanyIds(ctx, process),
  ]);

  for (const id of processCompanyIds) {
    if (currentCompanyIds.has(id)) return;
  }

  throw new Error("Access denied: Process does not belong to your company");
}

/**
 * Check if the current user can access data for a specific company.
 * Admin users can access all companies.
 * Client users can access only companies currently linked via
 * `peopleCompanies.isCurrent`, with `userProfiles.companyId` as a legacy
 * fallback for profiles without a linked person.
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

  if (userProfile.role === "client") {
    const currentCompanyIds = await getClientCurrentCompanyIds(ctx, userProfile);
    return currentCompanyIds.has(companyId);
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
