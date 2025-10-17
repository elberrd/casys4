import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Query to list all individual processes with optional filters
 */
export const list = query({
  args: {
    mainProcessId: v.optional(v.id("mainProcesses")),
    personId: v.optional(v.id("people")),
    status: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let results;

    // Apply filters
    if (args.mainProcessId !== undefined) {
      const mainProcessId = args.mainProcessId;
      results = await ctx.db
        .query("individualProcesses")
        .withIndex("by_mainProcess", (q) =>
          q.eq("mainProcessId", mainProcessId),
        )
        .collect();
    } else if (args.personId !== undefined) {
      const personId = args.personId;
      results = await ctx.db
        .query("individualProcesses")
        .withIndex("by_person", (q) => q.eq("personId", personId))
        .collect();
    } else if (args.status !== undefined) {
      const status = args.status;
      results = await ctx.db
        .query("individualProcesses")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else if (args.isActive !== undefined) {
      const isActive = args.isActive;
      results = await ctx.db
        .query("individualProcesses")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
    } else {
      results = await ctx.db.query("individualProcesses").collect();
    }

    // Filter by additional criteria if needed
    let filteredResults = results;
    if (args.mainProcessId === undefined && args.isActive !== undefined) {
      filteredResults = results.filter((r) => r.isActive === args.isActive);
    }
    if (args.personId === undefined && args.status !== undefined) {
      filteredResults = filteredResults.filter((r) => r.status === args.status);
    }

    // Enrich with related data
    const enrichedResults = await Promise.all(
      filteredResults.map(async (process) => {
        const [person, mainProcess, legalFramework, cbo] = await Promise.all([
          ctx.db.get(process.personId),
          ctx.db.get(process.mainProcessId),
          ctx.db.get(process.legalFrameworkId),
          process.cboId ? ctx.db.get(process.cboId) : null,
        ]);

        return {
          ...process,
          person,
          mainProcess,
          legalFramework,
          cbo,
        };
      }),
    );

    return enrichedResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Query to get individual process by ID with related data
 */
export const get = query({
  args: { id: v.id("individualProcesses") },
  handler: async (ctx, { id }) => {
    const process = await ctx.db.get(id);
    if (!process) return null;

    const [person, mainProcess, legalFramework, cbo] = await Promise.all([
      ctx.db.get(process.personId),
      ctx.db.get(process.mainProcessId),
      ctx.db.get(process.legalFrameworkId),
      process.cboId ? ctx.db.get(process.cboId) : null,
    ]);

    return {
      ...process,
      person,
      mainProcess,
      legalFramework,
      cbo,
    };
  },
});

/**
 * Mutation to create individual process
 */
export const create = mutation({
  args: {
    mainProcessId: v.id("mainProcesses"),
    personId: v.id("people"),
    status: v.string(),
    legalFrameworkId: v.id("legalFrameworks"),
    cboId: v.optional(v.id("cboCodes")),
    mreOfficeNumber: v.optional(v.string()),
    douNumber: v.optional(v.string()),
    douSection: v.optional(v.string()),
    douPage: v.optional(v.string()),
    douDate: v.optional(v.string()),
    protocolNumber: v.optional(v.string()),
    rnmNumber: v.optional(v.string()),
    rnmDeadline: v.optional(v.string()),
    appointmentDateTime: v.optional(v.string()),
    deadlineDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const processId = await ctx.db.insert("individualProcesses", {
      mainProcessId: args.mainProcessId,
      personId: args.personId,
      status: args.status,
      legalFrameworkId: args.legalFrameworkId,
      cboId: args.cboId,
      mreOfficeNumber: args.mreOfficeNumber,
      douNumber: args.douNumber,
      douSection: args.douSection,
      douPage: args.douPage,
      douDate: args.douDate,
      protocolNumber: args.protocolNumber,
      rnmNumber: args.rnmNumber,
      rnmDeadline: args.rnmDeadline,
      appointmentDateTime: args.appointmentDateTime,
      deadlineDate: args.deadlineDate,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return processId;
  },
});

/**
 * Mutation to update individual process
 */
export const update = mutation({
  args: {
    id: v.id("individualProcesses"),
    status: v.optional(v.string()),
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    cboId: v.optional(v.id("cboCodes")),
    mreOfficeNumber: v.optional(v.string()),
    douNumber: v.optional(v.string()),
    douSection: v.optional(v.string()),
    douPage: v.optional(v.string()),
    douDate: v.optional(v.string()),
    protocolNumber: v.optional(v.string()),
    rnmNumber: v.optional(v.string()),
    rnmDeadline: v.optional(v.string()),
    appointmentDateTime: v.optional(v.string()),
    deadlineDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Individual process not found");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Only update provided fields
    if (args.status !== undefined) updates.status = args.status;
    if (args.legalFrameworkId !== undefined)
      updates.legalFrameworkId = args.legalFrameworkId;
    if (args.cboId !== undefined) updates.cboId = args.cboId;
    if (args.mreOfficeNumber !== undefined)
      updates.mreOfficeNumber = args.mreOfficeNumber;
    if (args.douNumber !== undefined) updates.douNumber = args.douNumber;
    if (args.douSection !== undefined) updates.douSection = args.douSection;
    if (args.douPage !== undefined) updates.douPage = args.douPage;
    if (args.douDate !== undefined) updates.douDate = args.douDate;
    if (args.protocolNumber !== undefined)
      updates.protocolNumber = args.protocolNumber;
    if (args.rnmNumber !== undefined) updates.rnmNumber = args.rnmNumber;
    if (args.rnmDeadline !== undefined) updates.rnmDeadline = args.rnmDeadline;
    if (args.appointmentDateTime !== undefined)
      updates.appointmentDateTime = args.appointmentDateTime;
    if (args.deadlineDate !== undefined)
      updates.deadlineDate = args.deadlineDate;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    // Mark as completed if status is completed
    if (args.status === "completed" && !process.completedAt) {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(id, updates);

    return id;
  },
});

/**
 * Mutation to delete individual process
 */
export const remove = mutation({
  args: { id: v.id("individualProcesses") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/**
 * Query to get individual processes by main process
 */
export const listByMainProcess = query({
  args: { mainProcessId: v.id("mainProcesses") },
  handler: async (ctx, { mainProcessId }) => {
    const results = await ctx.db
      .query("individualProcesses")
      .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", mainProcessId))
      .collect();

    // Enrich with person data
    const enrichedResults = await Promise.all(
      results.map(async (process) => {
        const [person, legalFramework, cbo] = await Promise.all([
          ctx.db.get(process.personId),
          ctx.db.get(process.legalFrameworkId),
          process.cboId ? ctx.db.get(process.cboId) : null,
        ]);

        return {
          ...process,
          person,
          legalFramework,
          cbo,
        };
      }),
    );

    return enrichedResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});
