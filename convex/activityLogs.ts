import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";

/**
 * Internal mutation to create an activity log entry
 * Called by other mutations after successful operations
 */
export const logActivity = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("activityLogs", {
      userId: args.userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      details: args.details,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });

    return logId;
  },
});

/**
 * Query to get activity logs with filters
 * Admin sees all logs, client users see only their own actions
 */
export const getActivityLogs = query({
  args: {
    userId: v.optional(v.id("users")),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    action: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const limit = args.limit ?? 100;
    const offset = args.offset ?? 0;

    let results = await ctx.db.query("activityLogs").order("desc").collect();

    // Apply role-based filtering
    if (userProfile.role !== "admin") {
      // Non-admin users can only see their own activity
      results = results.filter((log) => log.userId === userProfile.userId);
    }

    // Apply filters
    if (args.userId) {
      results = results.filter((log) => log.userId === args.userId);
    }

    if (args.entityType) {
      results = results.filter((log) => log.entityType === args.entityType);
    }

    if (args.entityId) {
      results = results.filter((log) => log.entityId === args.entityId);
    }

    if (args.action) {
      results = results.filter((log) => log.action === args.action);
    }

    if (args.startDate) {
      results = results.filter((log) => log.createdAt >= args.startDate!);
    }

    if (args.endDate) {
      results = results.filter((log) => log.createdAt <= args.endDate!);
    }

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);

    // Enrich with user details
    const enrichedResults = await Promise.all(
      paginatedResults.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        const userProfile = user
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", user._id))
              .first()
          : null;

        return {
          ...log,
          user: userProfile
            ? {
                _id: userProfile._id,
                fullName: userProfile.fullName,
                email: userProfile.email,
              }
            : null,
        };
      })
    );

    return {
      logs: enrichedResults,
      total: results.length,
      hasMore: offset + limit < results.length,
    };
  },
});

/**
 * Query to get entity history
 * Returns all activity logs for a specific entity
 */
export const getEntityHistory = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    await getCurrentUserProfile(ctx); // Ensure authenticated

    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_entity_createdAt", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .order("desc")
      .collect();

    // Enrich with user details
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        const userProfile = user
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", user._id))
              .first()
          : null;

        return {
          ...log,
          user: userProfile
            ? {
                _id: userProfile._id,
                fullName: userProfile.fullName,
                email: userProfile.email,
              }
            : null,
        };
      })
    );

    return enrichedLogs;
  },
});

/**
 * Action to export activity logs
 * Admin only - exports filtered logs in specified format
 */
export const exportActivityLogs = action({
  args: {
    userId: v.optional(v.id("users")),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    action: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    format: v.union(v.literal("csv"), v.literal("json")),
  },
  handler: async (ctx, args): Promise<{ format: string; data: string }> => {
    // Import API for actions
    const { api } = await import("./_generated/api");

    // Check admin permissions
    await ctx.runQuery(api.activityLogs.checkAdminAccess, {});

    // Get logs with filters
    const result = await ctx.runQuery(api.activityLogs.getActivityLogs, {
      userId: args.userId,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      startDate: args.startDate,
      endDate: args.endDate,
      limit: 10000, // Large limit for export
    });

    if (args.format === "json") {
      return {
        format: "json",
        data: JSON.stringify(result.logs, null, 2),
      };
    }

    // CSV format
    if (result.logs.length === 0) {
      return {
        format: "csv",
        data: "No data to export",
      };
    }

    const headers = [
      "Timestamp",
      "User",
      "Email",
      "Action",
      "Entity Type",
      "Entity ID",
      "IP Address",
    ];

    const rows = result.logs.map((log: any) => [
      new Date(log.createdAt).toISOString(),
      log.user?.fullName || "Unknown",
      log.user?.email || "Unknown",
      log.action,
      log.entityType,
      log.entityId,
      log.ipAddress || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(",")),
    ].join("\n");

    return {
      format: "csv",
      data: csvContent,
    };
  },
});

/**
 * Helper query to check admin access
 * Used by action
 */
export const checkAdminAccess = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});
