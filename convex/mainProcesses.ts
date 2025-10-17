import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Query to list all main processes with optional filters
 */
export const list = query({
  args: {
    companyId: v.optional(v.id("companies")),
    processTypeId: v.optional(v.id("processTypes")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results;

    // Apply filters
    if (args.companyId !== undefined) {
      const companyId = args.companyId;
      results = await ctx.db
        .query("mainProcesses")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect();
    } else if (args.processTypeId !== undefined) {
      const processTypeId = args.processTypeId;
      results = await ctx.db
        .query("mainProcesses")
        .withIndex("by_processType", (q) =>
          q.eq("processTypeId", processTypeId),
        )
        .collect();
    } else if (args.status !== undefined) {
      const status = args.status;
      results = await ctx.db
        .query("mainProcesses")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      results = await ctx.db.query("mainProcesses").collect();
    }

    // Filter by additional criteria if needed
    let filteredResults = results;
    if (args.companyId === undefined && args.status !== undefined) {
      filteredResults = results.filter((r) => r.status === args.status);
    }
    if (args.processTypeId === undefined && args.status !== undefined) {
      filteredResults = filteredResults.filter((r) => r.status === args.status);
    }

    // Enrich with related data
    const enrichedResults = await Promise.all(
      filteredResults.map(async (process) => {
        const [company, contactPerson, processType, workplaceCity, consulate] =
          await Promise.all([
            ctx.db.get(process.companyId),
            ctx.db.get(process.contactPersonId),
            ctx.db.get(process.processTypeId),
            ctx.db.get(process.workplaceCityId),
            process.consulateId ? ctx.db.get(process.consulateId) : null,
          ]);

        // Count individual processes
        const individualProcesses = await ctx.db
          .query("individualProcesses")
          .withIndex("by_mainProcess", (q) =>
            q.eq("mainProcessId", process._id),
          )
          .collect();

        return {
          ...process,
          company,
          contactPerson,
          processType,
          workplaceCity,
          consulate,
          individualProcessesCount: individualProcesses.length,
        };
      }),
    );

    return enrichedResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Query to get main process by ID with related data
 */
export const get = query({
  args: { id: v.id("mainProcesses") },
  handler: async (ctx, { id }) => {
    const process = await ctx.db.get(id);
    if (!process) return null;

    const [company, contactPerson, processType, workplaceCity, consulate] =
      await Promise.all([
        ctx.db.get(process.companyId),
        ctx.db.get(process.contactPersonId),
        ctx.db.get(process.processTypeId),
        ctx.db.get(process.workplaceCityId),
        process.consulateId ? ctx.db.get(process.consulateId) : null,
      ]);

    // Get individual processes
    const individualProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", process._id))
      .collect();

    return {
      ...process,
      company,
      contactPerson,
      processType,
      workplaceCity,
      consulate,
      individualProcesses,
    };
  },
});

/**
 * Mutation to create main process
 */
export const create = mutation({
  args: {
    referenceNumber: v.string(),
    companyId: v.id("companies"),
    contactPersonId: v.id("people"),
    processTypeId: v.id("processTypes"),
    workplaceCityId: v.id("cities"),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.boolean(),
    requestDate: v.string(),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if reference number already exists
    const existing = await ctx.db
      .query("mainProcesses")
      .withIndex("by_referenceNumber", (q) =>
        q.eq("referenceNumber", args.referenceNumber),
      )
      .first();

    if (existing) {
      throw new Error(
        `Main process with reference number ${args.referenceNumber} already exists`,
      );
    }

    const processId = await ctx.db.insert("mainProcesses", {
      referenceNumber: args.referenceNumber,
      companyId: args.companyId,
      contactPersonId: args.contactPersonId,
      processTypeId: args.processTypeId,
      workplaceCityId: args.workplaceCityId,
      consulateId: args.consulateId,
      isUrgent: args.isUrgent,
      requestDate: args.requestDate,
      notes: args.notes,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    });

    return processId;
  },
});

/**
 * Mutation to update main process
 */
export const update = mutation({
  args: {
    id: v.id("mainProcesses"),
    referenceNumber: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    contactPersonId: v.optional(v.id("people")),
    processTypeId: v.optional(v.id("processTypes")),
    workplaceCityId: v.optional(v.id("cities")),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.optional(v.boolean()),
    requestDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Main process not found");
    }

    // Check if another process with this reference number exists
    if (args.referenceNumber !== undefined) {
      const referenceNumber = args.referenceNumber;
      const existing = await ctx.db
        .query("mainProcesses")
        .withIndex("by_referenceNumber", (q) =>
          q.eq("referenceNumber", referenceNumber),
        )
        .first();

      if (existing && existing._id !== id) {
        throw new Error(
          `Main process with reference number ${args.referenceNumber} already exists`,
        );
      }
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Only update provided fields
    if (args.referenceNumber !== undefined)
      updates.referenceNumber = args.referenceNumber;
    if (args.companyId !== undefined) updates.companyId = args.companyId;
    if (args.contactPersonId !== undefined)
      updates.contactPersonId = args.contactPersonId;
    if (args.processTypeId !== undefined)
      updates.processTypeId = args.processTypeId;
    if (args.workplaceCityId !== undefined)
      updates.workplaceCityId = args.workplaceCityId;
    if (args.consulateId !== undefined) updates.consulateId = args.consulateId;
    if (args.isUrgent !== undefined) updates.isUrgent = args.isUrgent;
    if (args.requestDate !== undefined) updates.requestDate = args.requestDate;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.status !== undefined) updates.status = args.status;

    // Mark as completed if status is completed
    if (args.status === "completed" && !process.completedAt) {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(id, updates);

    return id;
  },
});

/**
 * Mutation to delete main process
 */
export const remove = mutation({
  args: { id: v.id("mainProcesses") },
  handler: async (ctx, { id }) => {
    // Check if there are individual processes
    const individualProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", id))
      .collect();

    if (individualProcesses.length > 0) {
      throw new Error(
        "Cannot delete main process with associated individual processes",
      );
    }

    await ctx.db.delete(id);
  },
});

/**
 * Query to get main process by reference number
 */
export const getByReferenceNumber = query({
  args: { referenceNumber: v.string() },
  handler: async (ctx, { referenceNumber }) => {
    return await ctx.db
      .query("mainProcesses")
      .withIndex("by_referenceNumber", (q) =>
        q.eq("referenceNumber", referenceNumber),
      )
      .first();
  },
});
