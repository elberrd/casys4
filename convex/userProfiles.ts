import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

/**
 * Query to get the current authenticated user's profile
 * Returns null if not authenticated or profile not found
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile) {
      return null;
    }

    // Fetch related company data if user is a client
    let company = null;
    if (userProfile.companyId) {
      company = await ctx.db.get(userProfile.companyId);
    }

    return {
      ...userProfile,
      company,
    };
  },
});

/**
 * Query to list user profiles with role-based filtering
 * - Admin users can see all users
 * - Client users can only see users from their company
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("admin"), v.literal("client"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    // Get current user's profile
    const currentUser = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!currentUser) {
      throw new Error("User profile not found");
    }

    let users = await ctx.db.query("userProfiles").collect();

    // Filter by role-based access control
    if (currentUser.role === "client") {
      // Clients can only see users from their company
      if (!currentUser.companyId) {
        throw new Error("Client user must have a company");
      }
      users = users.filter((u) => u.companyId === currentUser.companyId);
    }

    // Apply optional filters
    if (args.isActive !== undefined) {
      users = users.filter((u) => u.isActive === args.isActive);
    }

    if (args.role !== undefined) {
      users = users.filter((u) => u.role === args.role);
    }

    // Enrich with company data
    const usersWithCompany = await Promise.all(
      users.map(async (user) => {
        const company = user.companyId
          ? await ctx.db.get(user.companyId)
          : null;
        return {
          ...user,
          company,
        };
      })
    );

    return usersWithCompany;
  },
});

/**
 * Query to list all admin users (for task assignment, etc.)
 * Requires authentication
 */
export const listAdminUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    // Get all admin users who are active
    const adminUsers = await ctx.db
      .query("userProfiles")
      .filter((q) => q.and(q.eq(q.field("role"), "admin"), q.eq(q.field("isActive"), true)))
      .collect();

    return adminUsers.map((user) => ({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      photoUrl: user.photoUrl,
    }));
  },
});

/**
 * Query to get a single user profile by ID with access control
 */
export const get = query({
  args: { id: v.id("userProfiles") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    // Get current user's profile
    const currentUser = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!currentUser) {
      throw new Error("User profile not found");
    }

    // Get requested user profile
    const userProfile = await ctx.db.get(id);
    if (!userProfile) {
      return null;
    }

    // Check access permissions
    if (currentUser.role === "client") {
      // Clients can only view users from their company
      if (
        !currentUser.companyId ||
        userProfile.companyId !== currentUser.companyId
      ) {
        throw new Error("Access denied: Cannot view users from other companies");
      }
    }

    // Fetch related company data
    const company = userProfile.companyId
      ? await ctx.db.get(userProfile.companyId)
      : null;

    return {
      ...userProfile,
      company,
    };
  },
});

/**
 * Mutation to create a new user profile (admin only)
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("admin"), v.literal("client")),
    companyId: v.optional(v.id("companies")),
    phoneNumber: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    // Get current user's profile
    const currentUser = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Access denied: Admin role required");
    }

    // Validate email uniqueness
    const existingUser = await ctx.db
      .query("userProfiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Validate role/company relationship
    if (args.role === "client" && !args.companyId) {
      throw new Error("Client users must have a company");
    }

    if (args.role === "admin" && args.companyId) {
      throw new Error("Admin users cannot be assigned to a company");
    }

    const now = Date.now();

    const userProfileId = await ctx.db.insert("userProfiles", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity (non-blocking)
    try {
      const company = args.companyId ? await ctx.db.get(args.companyId) : null;

      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userId,
        action: "created",
        entityType: "userProfile",
        entityId: userProfileId,
        details: {
          email: args.email,
          fullName: args.fullName,
          role: args.role,
          companyName: company?.name,
          isActive: args.isActive,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return userProfileId;
  },
});

/**
 * Mutation to update a user profile with access control
 */
export const update = mutation({
  args: {
    id: v.id("userProfiles"),
    email: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("admin"), v.literal("client")),
    companyId: v.optional(v.id("companies")),
    phoneNumber: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    // Get current user's profile
    const currentUser = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!currentUser) {
      throw new Error("User profile not found");
    }

    // Get target user profile
    const targetUser = await ctx.db.get(args.id);
    if (!targetUser) {
      throw new Error("Target user profile not found");
    }

    // Access control
    if (currentUser.role === "client") {
      // Clients can only update their own profile
      if (currentUser._id !== args.id) {
        throw new Error("Access denied: Can only update own profile");
      }
      // Clients cannot change role or company
      if (
        args.role !== currentUser.role ||
        args.companyId !== currentUser.companyId
      ) {
        throw new Error("Access denied: Cannot change role or company");
      }
    }

    // Admin validation for role changes
    if (currentUser.role === "admin") {
      // Validate role/company relationship
      if (args.role === "client" && !args.companyId) {
        throw new Error("Client users must have a company");
      }

      if (args.role === "admin" && args.companyId) {
        throw new Error("Admin users cannot be assigned to a company");
      }

      // Validate email uniqueness (if changed)
      if (args.email !== targetUser.email) {
        const existingUser = await ctx.db
          .query("userProfiles")
          .withIndex("by_email", (q) => q.eq("email", args.email))
          .first();

        if (existingUser) {
          throw new Error("Email already exists");
        }
      }
    }

    const { id, ...data } = args;

    await ctx.db.patch(id, {
      ...data,
      updatedAt: Date.now(),
    });

    // Log activity with before/after values (non-blocking)
    try {
      const changedFields: Record<string, { before: any; after: any }> = {};

      // Compare each field
      if (data.email !== targetUser.email) {
        changedFields.email = { before: targetUser.email, after: data.email };
      }
      if (data.fullName !== targetUser.fullName) {
        changedFields.fullName = { before: targetUser.fullName, after: data.fullName };
      }
      if (data.role !== targetUser.role) {
        changedFields.role = { before: targetUser.role, after: data.role };
      }
      if (data.companyId !== targetUser.companyId) {
        const [oldCompany, newCompany] = await Promise.all([
          targetUser.companyId ? ctx.db.get(targetUser.companyId) : null,
          data.companyId ? ctx.db.get(data.companyId) : null,
        ]);
        changedFields.company = {
          before: oldCompany?.name ?? null,
          after: newCompany?.name ?? null,
        };
      }
      if (data.isActive !== targetUser.isActive) {
        changedFields.isActive = { before: targetUser.isActive, after: data.isActive };
      }

      if (Object.keys(changedFields).length > 0) {
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userId,
          action: data.isActive === false && targetUser.isActive === true ? "deactivated" : "updated",
          entityType: "userProfile",
          entityId: id,
          details: {
            email: targetUser.email,
            fullName: targetUser.fullName,
            changes: changedFields,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Mutation to delete a user profile (admin only)
 */
export const remove = mutation({
  args: { id: v.id("userProfiles") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    // Get current user's profile
    const currentUser = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Access denied: Admin role required");
    }

    // Prevent self-deletion
    if (currentUser._id === id) {
      throw new Error("Cannot delete your own profile");
    }

    const targetUser = await ctx.db.get(id);
    if (!targetUser) {
      throw new Error("Target user profile not found");
    }

    // TODO: Add checks for related data when those tables are implemented
    // - Check if user has created/assigned tasks
    // - Check if user has created processes
    // - Consider soft delete instead of hard delete

    await ctx.db.delete(id);

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userId,
        action: "deleted",
        entityType: "userProfile",
        entityId: id,
        details: {
          email: targetUser.email,
          fullName: targetUser.fullName,
          role: targetUser.role,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  },
});

/**
 * Internal mutation to seed initial admin user (bypasses authentication)
 * This should only be used for initial setup/testing
 */
export const seedAdminUser = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    fullName: v.string(),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingProfile) {
      throw new Error("User profile already exists for this userId");
    }

    // Check email uniqueness
    const existingEmail = await ctx.db
      .query("userProfiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingEmail) {
      throw new Error("Email already exists");
    }

    const now = Date.now();

    const userProfileId = await ctx.db.insert("userProfiles", {
      userId: args.userId,
      email: args.email,
      fullName: args.fullName,
      role: "admin",
      companyId: undefined,
      phoneNumber: args.phoneNumber,
      photoUrl: undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return userProfileId;
  },
});
