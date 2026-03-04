import { v } from "convex/values";
import { query, action, internalMutation, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";

const ENTITY_TYPE_GROUPS: Record<string, string[]> = {
  collectiveprocess: ["collectiveProcess", "collectiveProcesses"],
  individualprocess: ["individualProcess", "individualProcesses"],
  individualprocessstatus: ["individualProcessStatus", "individualProcessStatuses"],
  document: ["document", "documents", "documentsDelivered"],
  task: ["task", "tasks"],
  userprofile: ["userProfile", "userProfiles"],
  company: ["company", "companies"],
  person: ["person", "people"],
  passport: ["passport", "passports"],
  processrequest: ["processRequest", "processRequests"],
  note: ["note", "notes"],
  savedfilter: ["savedFilter", "savedFilters"],
  economicactivity: ["economicActivity", "economicActivities"],
  country: ["country", "countries"],
  state: ["state", "states"],
  city: ["city", "cities"],
  casestatus: ["caseStatus", "caseStatuses"],
  processtype: ["processType", "processTypes"],
  legalframework: ["legalFramework", "legalFrameworks"],
  cbocode: ["cboCode", "cboCodes"],
  consulate: ["consulate", "consulates"],
  documentcategory: ["documentCategory", "documentCategories"],
  documenttype: ["documentType", "documentTypes"],
  peoplecompany: ["peopleCompany", "peopleCompanies"],
};

const ENTITY_TYPE_CANONICAL = new Map<string, string>();
for (const aliases of Object.values(ENTITY_TYPE_GROUPS)) {
  const canonical = aliases[0];
  for (const alias of aliases) {
    ENTITY_TYPE_CANONICAL.set(alias.replace(/[^a-z0-9]/gi, "").toLowerCase(), canonical);
  }
}

function normalizeEntityType(entityType: string): string {
  const key = entityType.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return ENTITY_TYPE_CANONICAL.get(key) ?? entityType;
}

function getEntityTypeCandidates(entityType: string): string[] {
  const key = entityType.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const canonical = ENTITY_TYPE_CANONICAL.get(key) ?? entityType;
  const canonicalKey = canonical.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return ENTITY_TYPE_GROUPS[canonicalKey] ?? [canonical];
}

async function enrichLogUser<T extends { userId: Id<"users"> }>(
  ctx: QueryCtx,
  log: T
): Promise<
  T & {
    user: {
      _id: Id<"userProfiles">;
      fullName: string;
      email: string;
    } | null;
  }
> {
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
}

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
      entityType: normalizeEntityType(args.entityType),
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
 * Query to get a single activity log by ID
 */
export const get = query({
  args: {
    id: v.id("activityLogs"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const activityLog = await ctx.db.get(args.id);

    if (!activityLog) {
      return null;
    }

    // Non-admin users can only see their own activity
    if (userProfile.role !== "admin" && activityLog.userId !== userProfile.userId) {
      return null;
    }

    return await enrichLogUser(ctx, activityLog);
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
      const entityTypeCandidates = getEntityTypeCandidates(args.entityType);
      results = results.filter((log) => entityTypeCandidates.includes(log.entityType));
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

    const enrichedResults = await Promise.all(paginatedResults.map((log) => enrichLogUser(ctx, log)));

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

    const entityTypeCandidates = getEntityTypeCandidates(args.entityType);
    const logsByType = await Promise.all(
      entityTypeCandidates.map((entityType) =>
        ctx.db
          .query("activityLogs")
          .withIndex("by_entity_createdAt", (q) =>
            q.eq("entityType", entityType).eq("entityId", args.entityId)
          )
          .order("desc")
          .collect()
      )
    );

    const logs = logsByType.flat().sort((a, b) => b.createdAt - a.createdAt);
    const enrichedLogs = await Promise.all(logs.map((log) => enrichLogUser(ctx, log)));

    return enrichedLogs;
  },
});

/**
 * Query to get available filter options from current logs
 * Includes only users/entities the current viewer can access
 */
export const getFilterOptions = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUserProfile(ctx);

    let logs = await ctx.db.query("activityLogs").order("desc").collect();
    if (currentUser.role !== "admin") {
      logs = logs.filter((log) => log.userId === currentUser.userId);
    }

    const actionSet = new Set<string>();
    const entityTypeSet = new Set<string>();
    const userIdSet = new Set<Id<"users">>();

    for (const log of logs) {
      actionSet.add(log.action);
      entityTypeSet.add(log.entityType);
      userIdSet.add(log.userId);
    }

    const users = await Promise.all(
      Array.from(userIdSet).map(async (userId) => {
        const user = await ctx.db.get(userId);
        const profile = user
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", user._id))
              .first()
          : null;

        return {
          userId,
          fullName: profile?.fullName ?? "Usuário removido",
          email: profile?.email,
        };
      })
    );

    users.sort((a, b) => {
      const aKey = `${a.fullName} ${a.email ?? ""}`.toLowerCase();
      const bKey = `${b.fullName} ${b.email ?? ""}`.toLowerCase();
      return aKey.localeCompare(bKey);
    });

    return {
      actions: Array.from(actionSet).sort((a, b) => a.localeCompare(b)),
      entityTypes: Array.from(entityTypeSet).sort((a, b) => a.localeCompare(b)),
      users,
    };
  },
});

/**
 * Query to summarize activity logs with the current filters
 */
export const getAuditSummary = query({
  args: {
    userId: v.optional(v.id("users")),
    entityType: v.optional(v.string()),
    action: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserProfile(ctx);

    let logs = await ctx.db.query("activityLogs").order("desc").collect();

    if (currentUser.role !== "admin") {
      logs = logs.filter((log) => log.userId === currentUser.userId);
    }

    if (args.userId) {
      logs = logs.filter((log) => log.userId === args.userId);
    }

    if (args.entityType) {
      const entityTypeCandidates = getEntityTypeCandidates(args.entityType);
      logs = logs.filter((log) => entityTypeCandidates.includes(log.entityType));
    }

    if (args.action) {
      logs = logs.filter((log) => log.action === args.action);
    }

    if (args.startDate !== undefined) {
      const startDate = args.startDate;
      logs = logs.filter((log) => log.createdAt >= startDate);
    }

    if (args.endDate !== undefined) {
      const endDate = args.endDate;
      logs = logs.filter((log) => log.createdAt <= endDate);
    }

    const uniqueUsers = new Set(logs.map((log) => log.userId));
    const uniqueEntities = new Set(logs.map((log) => `${log.entityType}:${log.entityId}`));

    const actionCounts = logs.reduce(
      (acc, log) => {
        if (log.action === "created") acc.created += 1;
        if (log.action === "updated") acc.updated += 1;
        if (log.action === "deleted") acc.deleted += 1;
        return acc;
      },
      { created: 0, updated: 0, deleted: 0 }
    );

    const uniqueUserArray = Array.from(uniqueUsers);
    const userProfiles = await Promise.all(
      uniqueUserArray.map(async (userId) => {
        const user = await ctx.db.get(userId);
        return user
          ? ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", user._id))
              .first()
          : null;
      })
    );

    const logsWithoutProfile = uniqueUserArray.length - userProfiles.filter(Boolean).length;

    return {
      total: logs.length,
      created: actionCounts.created,
      updated: actionCounts.updated,
      deleted: actionCounts.deleted,
      uniqueUsers: uniqueUsers.size,
      uniqueEntities: uniqueEntities.size,
      logsWithoutProfile,
      latestAt: logs.length > 0 ? logs[0].createdAt : null,
    };
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

    const rows = result.logs.map((log) => [
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
