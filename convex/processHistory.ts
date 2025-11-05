import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";

/**
 * Query to list all process history records with optional filters
 * Access control: Admins see all history, clients see only their company's processes
 */
export const list = query({
  args: {
    individualProcessId: v.optional(v.id("individualProcesses")),
    changedBy: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    let results;

    // Apply filters
    if (args.individualProcessId !== undefined) {
      const individualProcessId = args.individualProcessId;
      results = await ctx.db
        .query("processHistory")
        .withIndex("by_individualProcess", (q) =>
          q.eq("individualProcessId", individualProcessId),
        )
        .order("desc")
        .collect();
    } else if (args.changedBy !== undefined) {
      const changedBy = args.changedBy;
      results = await ctx.db
        .query("processHistory")
        .withIndex("by_changedBy", (q) => q.eq("changedBy", changedBy))
        .order("desc")
        .collect();
    } else {
      results = await ctx.db
        .query("processHistory")
        .withIndex("by_changedAt")
        .order("desc")
        .collect();
    }

    // Apply role-based access control via individualProcess.mainProcess.companyId
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Filter by company - fetch individualProcess and mainProcess for each result
      const filteredByCompany = await Promise.all(
        results.map(async (historyRecord) => {
          const individualProcess = await ctx.db.get(
            historyRecord.individualProcessId,
          );
          if (!individualProcess) return null;

          const mainProcess = await ctx.db.get(individualProcess.mainProcessId);
          if (mainProcess && mainProcess.companyId === userProfile.companyId) {
            return historyRecord;
          }
          return null;
        }),
      );

      results = filteredByCompany.filter((h) => h !== null) as typeof results;
    }

    // Apply limit if specified
    if (args.limit !== undefined && args.limit > 0) {
      results = results.slice(0, args.limit);
    }

    // Enrich with related data
    const enrichedResults = await Promise.all(
      results.map(async (historyRecord) => {
        const [individualProcess, changedByUser] = await Promise.all([
          ctx.db.get(historyRecord.individualProcessId),
          ctx.db.get(historyRecord.changedBy),
        ]);

        // Get user profile for full name
        let changedByProfile = null;
        if (changedByUser) {
          changedByProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", changedByUser._id))
            .first();
        }

        return {
          ...historyRecord,
          individualProcess,
          changedByUser,
          changedByProfile,
        };
      }),
    );

    return enrichedResults;
  },
});

/**
 * Query to get timeline for a specific individual process
 * Returns history ordered chronologically (oldest first)
 * Access control: Admins see all, clients see only their company's processes
 */
export const getByIndividualProcess = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Check access to this individual process
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // If client user, verify they have access to this company's processes
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      const mainProcess = await ctx.db.get(individualProcess.mainProcessId);
      if (!mainProcess || mainProcess.companyId !== userProfile.companyId) {
        throw new Error("Access denied to this process");
      }
    }

    // Get all history records for this individual process
    const historyRecords = await ctx.db
      .query("processHistory")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", args.individualProcessId),
      )
      .order("asc") // Oldest first for timeline display
      .collect();

    // Enrich with user information
    const enrichedRecords = await Promise.all(
      historyRecords.map(async (record) => {
        const changedByUser = await ctx.db.get(record.changedBy);

        // Get user profile for full name
        let changedByProfile = null;
        if (changedByUser) {
          changedByProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", changedByUser._id))
            .first();
        }

        return {
          ...record,
          changedByUser,
          changedByProfile,
        };
      }),
    );

    return enrichedRecords;
  },
});

/**
 * Admin-only mutation to create a process history record
 * In practice, this is usually called by internal helper function
 */
export const create = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    previousStatus: v.optional(v.string()),
    newStatus: v.string(),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    const historyId = await ctx.db.insert("processHistory", {
      individualProcessId: args.individualProcessId,
      previousStatus: args.previousStatus,
      newStatus: args.newStatus,
      changedBy: userProfile.userId!,
      changedAt: Date.now(),
      notes: args.notes,
      metadata: args.metadata,
    });

    return historyId;
  },
});

/**
 * Internal mutation to create history record (called by other mutations)
 * This bypasses access control since it's called from trusted code
 */
export const createHistoryRecord = internalMutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    previousStatus: v.optional(v.string()),
    newStatus: v.string(),
    changedBy: v.id("users"),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const historyId = await ctx.db.insert("processHistory", {
      individualProcessId: args.individualProcessId,
      previousStatus: args.previousStatus,
      newStatus: args.newStatus,
      changedBy: args.changedBy,
      changedAt: Date.now(),
      notes: args.notes,
      metadata: args.metadata,
    });

    return historyId;
  },
});
