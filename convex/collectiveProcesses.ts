import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { internal } from "./_generated/api";
import { normalizeString } from "./lib/stringUtils";
import { calculateCollectiveProcessStatus } from "./lib/statusCalculation";

/**
 * Query to list all collective processes with optional filters
 * Access control: Admins see all processes, clients see only their company's processes
 */
export const list = query({
  args: {
    companyId: v.optional(v.id("companies")),
    processTypeId: v.optional(v.id("processTypes")),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    let results;

    // For client users, override companyId filter to their own company
    let effectiveCompanyId = args.companyId;
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }
      effectiveCompanyId = userProfile.companyId;
    }

    // Apply filters
    if (effectiveCompanyId !== undefined) {
      const companyId = effectiveCompanyId;
      results = await ctx.db
        .query("collectiveProcesses")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect();
    } else if (args.processTypeId !== undefined) {
      const processTypeId = args.processTypeId;
      results = await ctx.db
        .query("collectiveProcesses")
        .withIndex("by_processType", (q) =>
          q.eq("processTypeId", processTypeId),
        )
        .collect();
    } else if (args.status !== undefined) {
      const status = args.status;
      results = await ctx.db
        .query("collectiveProcesses")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      results = await ctx.db.query("collectiveProcesses").collect();
    }

    // For client users, ensure all results are filtered by their company
    if (userProfile.role === "client" && effectiveCompanyId) {
      results = results.filter((r) => r.companyId === effectiveCompanyId);
    }

    // Filter by additional criteria if needed
    let filteredResults = results;
    if (args.companyId === undefined && args.status !== undefined) {
      filteredResults = results.filter((r) => r.status === args.status);
    }
    if (args.processTypeId === undefined && args.status !== undefined) {
      filteredResults = filteredResults.filter((r) => r.status === args.status);
    }

    // Enrich with related data first, then apply search filter
    const enrichedBeforeSearch = await Promise.all(
      filteredResults.map(async (process) => {
        const [company, contactPerson, processType, workplaceCity, consulate] =
          await Promise.all([
            process.companyId ? ctx.db.get(process.companyId) : null,
            process.contactPersonId ? ctx.db.get(process.contactPersonId) : null,
            process.processTypeId ? ctx.db.get(process.processTypeId) : null,
            process.workplaceCityId ? ctx.db.get(process.workplaceCityId) : null,
            process.consulateId ? ctx.db.get(process.consulateId) : null,
          ]);

        // Get individual processes with case statuses
        const individualProcessesRaw = await ctx.db
          .query("individualProcesses")
          .withIndex("by_collectiveProcess", (q) =>
            q.eq("collectiveProcessId", process._id),
          )
          .collect();

        // Enrich individual processes with all related data
        const individualProcesses = await Promise.all(
          individualProcessesRaw.map(async (ip) => {
            const [caseStatus, person, activeStatus] = await Promise.all([
              ip.caseStatusId ? ctx.db.get(ip.caseStatusId) : null,
              ip.personId ? ctx.db.get(ip.personId) : null,
              ctx.db
                .query("individualProcessStatuses")
                .withIndex("by_individualProcess_active", (q) =>
                  q.eq("individualProcessId", ip._id).eq("isActive", true)
                )
                .first(),
            ]);
            return {
              ...ip,
              caseStatus,
              person,
              activeStatus,
            };
          })
        );

        // Calculate collective process status
        const calculatedStatus = calculateCollectiveProcessStatus(individualProcesses, "pt");

        return {
          ...process,
          company,
          contactPerson,
          processType,
          workplaceCity,
          consulate,
          individualProcessesCount: individualProcesses.length,
          calculatedStatus,
        };
      }),
    );

    // Apply accent-insensitive search filter after enrichment
    let enrichedResults = enrichedBeforeSearch;
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      enrichedResults = enrichedBeforeSearch.filter(
        (process) =>
          normalizeString(process.referenceNumber).includes(searchNormalized) ||
          (process.notes && normalizeString(process.notes).includes(searchNormalized)) ||
          (process.company && normalizeString(process.company.name).includes(searchNormalized)) ||
          (process.contactPerson && normalizeString(process.contactPerson.fullName).includes(searchNormalized))
      );
    }

    return enrichedResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Query to get collective process by ID with related data
 * Access control: Admins can view any process, clients can only view their company's processes
 */
export const get = query({
  args: { id: v.id("collectiveProcesses") },
  handler: async (ctx, { id }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const process = await ctx.db.get(id);
    if (!process) return null;

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId || process.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view this process"
        );
      }
    }

    const [company, contactPerson, processType, workplaceCity, consulateRaw] =
      await Promise.all([
        process.companyId ? ctx.db.get(process.companyId) : null,
        process.contactPersonId ? ctx.db.get(process.contactPersonId) : null,
        process.processTypeId ? ctx.db.get(process.processTypeId) : null,
        process.workplaceCityId ? ctx.db.get(process.workplaceCityId) : null,
        process.consulateId ? ctx.db.get(process.consulateId) : null,
      ]);

    // Enrich consulate with city data
    let consulate = null;
    if (consulateRaw) {
      const consulateCity = consulateRaw.cityId ? await ctx.db.get(consulateRaw.cityId) : null;
      consulate = {
        ...consulateRaw,
        city: consulateCity,
      };
    }

    // Get individual processes with their case statuses
    const individualProcessesRaw = await ctx.db
      .query("individualProcesses")
      .withIndex("by_collectiveProcess", (q) => q.eq("collectiveProcessId", process._id))
      .collect();

    // Enrich individual processes with all related data for table display
    const individualProcesses = await Promise.all(
      individualProcessesRaw.map(async (ip) => {
        const [caseStatus, person, ipProcessType, legalFramework, companyApplicant, userApplicant, activeStatus] = await Promise.all([
          ip.caseStatusId ? ctx.db.get(ip.caseStatusId) : null,
          ip.personId ? ctx.db.get(ip.personId) : null,
          ip.processTypeId ? ctx.db.get(ip.processTypeId) : null,
          ip.legalFrameworkId ? ctx.db.get(ip.legalFrameworkId) : null,
          ip.companyApplicantId ? ctx.db.get(ip.companyApplicantId) : null,
          ip.userApplicantId ? ctx.db.get(ip.userApplicantId) : null,
          // Get the active status with filled fields data
          ctx.db
            .query("individualProcessStatuses")
            .withIndex("by_individualProcess_active", (q) =>
              q.eq("individualProcessId", ip._id).eq("isActive", true)
            )
            .first(),
        ]);
        return {
          ...ip,
          caseStatus,
          person,
          processType: ipProcessType,
          legalFramework,
          companyApplicant,
          userApplicant,
          activeStatus,
        };
      })
    );

    // Calculate collective process status from individual processes
    const calculatedStatus = calculateCollectiveProcessStatus(individualProcesses, "pt");

    // Check if this collective process was created from a process request
    let originRequest = null;
    const request = await ctx.db
      .query("processRequests")
      .withIndex("by_approvedCollectiveProcess", (q) =>
        q.eq("approvedCollectiveProcessId", process._id),
      )
      .first();

    if (request) {
      // Get reviewer profile
      let reviewerProfile = null;
      if (request.reviewedBy) {
        const reviewer = await ctx.db.get(request.reviewedBy);
        if (reviewer) {
          reviewerProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", reviewer._id))
            .first();
        }
      }

      originRequest = {
        _id: request._id,
        status: request.status,
        requestDate: request.requestDate,
        isUrgent: request.isUrgent,
        reviewedBy: request.reviewedBy,
        reviewedAt: request.reviewedAt,
        reviewerProfile,
        createdAt: request.createdAt,
      };
    }

    return {
      ...process,
      company,
      contactPerson,
      processType,
      workplaceCity,
      consulate,
      individualProcesses,
      originRequest,
      calculatedStatus,
    };
  },
});

/**
 * Mutation to create collective process (admin only)
 * NOTE: Status is now calculated from individual processes, but kept for backward compatibility
 */
export const create = mutation({
  args: {
    referenceNumber: v.string(),
    companyId: v.id("companies"),
    contactPersonId: v.id("people"),
    processTypeId: v.id("processTypes"),
    workplaceCityId: v.optional(v.id("cities")),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.optional(v.boolean()),
    requestDate: v.string(),
    notes: v.optional(v.string()),
    // DEPRECATED: Status is calculated, kept for backward compatibility during migration
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const now = Date.now();

    // Check if reference number already exists
    const existing = await ctx.db
      .query("collectiveProcesses")
      .withIndex("by_referenceNumber", (q) =>
        q.eq("referenceNumber", args.referenceNumber),
      )
      .first();

    if (existing) {
      throw new Error(
        `Collective process with reference number ${args.referenceNumber} already exists`,
      );
    }

    const processId = await ctx.db.insert("collectiveProcesses", {
      referenceNumber: args.referenceNumber,
      companyId: args.companyId,
      contactPersonId: args.contactPersonId,
      processTypeId: args.processTypeId,
      workplaceCityId: args.workplaceCityId,
      consulateId: args.consulateId,
      isUrgent: args.isUrgent ?? false,
      requestDate: args.requestDate,
      notes: args.notes,
      // DEPRECATED: Kept for backward compatibility, status is now calculated
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    });

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId!,
        action: "created",
        entityType: "collectiveProcess",
        entityId: processId,
        details: {
          referenceNumber: args.referenceNumber,
          companyId: args.companyId,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return processId;
  },
});

/**
 * Mutation to update collective process (admin only)
 * NOTE: Status is now calculated from individual processes, but kept for backward compatibility
 */
export const update = mutation({
  args: {
    id: v.id("collectiveProcesses"),
    referenceNumber: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    contactPersonId: v.optional(v.id("people")),
    processTypeId: v.optional(v.id("processTypes")),
    workplaceCityId: v.optional(v.id("cities")),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.optional(v.boolean()),
    requestDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    // DEPRECATED: Status is calculated, kept for backward compatibility during migration
    status: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Collective process not found");
    }

    // Check if another process with this reference number exists
    if (args.referenceNumber !== undefined) {
      const referenceNumber = args.referenceNumber;
      const existing = await ctx.db
        .query("collectiveProcesses")
        .withIndex("by_referenceNumber", (q) =>
          q.eq("referenceNumber", referenceNumber),
        )
        .first();

      if (existing && existing._id !== id) {
        throw new Error(
          `Collective process with reference number ${args.referenceNumber} already exists`,
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
    // DEPRECATED: Status kept for backward compatibility
    if (args.status !== undefined) updates.status = args.status;

    // DEPRECATED: completedAt kept for backward compatibility
    if (args.status === "completed" && !process.completedAt) {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(id, updates);

    // Log activity with before/after values (non-blocking)
    try {
      const changedFields: Record<string, { before: any; after: any }> = {};
      Object.keys(updates).forEach((key) => {
        if (key !== "updatedAt" && updates[key] !== process[key as keyof typeof process]) {
          changedFields[key] = {
            before: process[key as keyof typeof process],
            after: updates[key],
          };
        }
      });

      if (Object.keys(changedFields).length > 0) {
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId!,
          action: args.status && args.status !== process.status ? "status_changed" : "updated",
          entityType: "collectiveProcess",
          entityId: id,
          details: {
            referenceNumber: process.referenceNumber,
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
 * Mutation to delete collective process (admin only)
 */
export const remove = mutation({
  args: { id: v.id("collectiveProcesses") },
  handler: async (ctx, { id }) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    const process = await ctx.db.get(id);
    if (!process) {
      throw new Error("Collective process not found");
    }

    // Check if there are individual processes
    const individualProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_collectiveProcess", (q) => q.eq("collectiveProcessId", id))
      .collect();

    if (individualProcesses.length > 0) {
      throw new Error(
        "Cannot delete collective process with associated individual processes",
      );
    }

    // Check if this process was created from an approved request
    const originRequest = await ctx.db
      .query("processRequests")
      .withIndex("by_approvedCollectiveProcess", (q) =>
        q.eq("approvedCollectiveProcessId", id),
      )
      .first();

    if (originRequest) {
      throw new Error(
        "Cannot delete collective process created from an approved request. Please reject or unlink the request first.",
      );
    }

    await ctx.db.delete(id);

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId!,
        action: "deleted",
        entityType: "collectiveProcess",
        entityId: id,
        details: {
          referenceNumber: process.referenceNumber,
          status: process.status,
          companyId: process.companyId,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Query to get collective process by reference number
 * Access control: Admins can search any process, clients can only find their company's processes
 */
export const getByReferenceNumber = query({
  args: { referenceNumber: v.string() },
  handler: async (ctx, { referenceNumber }) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    const process = await ctx.db
      .query("collectiveProcesses")
      .withIndex("by_referenceNumber", (q) =>
        q.eq("referenceNumber", referenceNumber),
      )
      .first();

    if (!process) return null;

    // Check access permissions for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId || process.companyId !== userProfile.companyId) {
        throw new Error(
          "Access denied: You do not have permission to view this process"
        );
      }
    }

    return process;
  },
});

// REMOVED: complete(), cancel(), and reopen() mutations
// These mutations are no longer needed because:
// - Collective process status is now calculated from individual process statuses
// - Individual processes should be updated directly to change the collective process status
// - This provides more accurate and automatic status tracking

/**
 * Mutation to add multiple people to a collective process
 * Creates individual processes for each person with data copied from collective process
 */
export const addPeopleToCollectiveProcess = mutation({
  args: {
    collectiveProcessId: v.id("collectiveProcesses"),
    personIds: v.array(v.id("people")),
    requestDate: v.string(),
    consulateId: v.id("consulates"),
    caseStatusId: v.id("caseStatuses"),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    // Verify collective process exists
    const collectiveProcess = await ctx.db.get(args.collectiveProcessId);
    if (!collectiveProcess) {
      throw new Error("Collective process not found");
    }

    // Verify case status exists
    const caseStatus = await ctx.db.get(args.caseStatusId);
    if (!caseStatus) {
      throw new Error("Case status not found");
    }

    // Get existing individual processes to check for duplicates
    const existingProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_collectiveProcess", (q) =>
        q.eq("collectiveProcessId", args.collectiveProcessId)
      )
      .collect();

    const existingPersonIds = new Set(existingProcesses.map((p) => p.personId));

    const results = {
      successful: [] as Id<"individualProcesses">[],
      failed: [] as { personId: Id<"people">; reason: string }[],
      totalProcessed: args.personIds.length,
    };

    const now = Date.now();

    // Process each person
    for (const personId of args.personIds) {
      try {
        // Verify person exists
        const person = await ctx.db.get(personId);
        if (!person) {
          results.failed.push({
            personId,
            reason: "Person not found",
          });
          continue;
        }

        // Check for duplicate
        if (existingPersonIds.has(personId)) {
          results.failed.push({
            personId,
            reason: `${person.fullName} is already in this collective process`,
          });
          continue;
        }

        // Create individual process with data from collective process
        const individualProcessId = await ctx.db.insert("individualProcesses", {
          collectiveProcessId: args.collectiveProcessId,
          personId: personId,
          companyApplicantId: collectiveProcess.companyId,
          processTypeId: collectiveProcess.processTypeId,
          consulateId: args.consulateId,
          dateProcess: args.requestDate,
          caseStatusId: args.caseStatusId,
          status: caseStatus.code || "pending",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        // Create initial status record
        if (userProfile.userId) {
          await ctx.db.insert("individualProcessStatuses", {
            individualProcessId,
            caseStatusId: args.caseStatusId,
            statusName: caseStatus.name,
            isActive: true,
            createdAt: now,
            changedAt: now,
            changedBy: userProfile.userId,
            notes: "Initial status on creation",
          });
        }

        // Generate document checklist for this individual process
        try {
          // Import and call generateDocumentChecklist
          const { generateDocumentChecklist } = await import("./lib/documentChecklist");
          await generateDocumentChecklist(ctx, individualProcessId);
        } catch (error) {
          console.error("Failed to generate document checklist:", error);
          // Continue even if document checklist fails
        }

        // Add to existing set to prevent duplicates in same batch
        existingPersonIds.add(personId);

        results.successful.push(individualProcessId);

        // Log activity
        if (userProfile.userId) {
          await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
            userId: userProfile.userId,
            action: "add_person_to_collective",
            entityType: "individualProcesses",
            entityId: individualProcessId,
            details: {
              personId,
              personName: person.fullName,
              collectiveProcessId: args.collectiveProcessId,
              caseStatusId: args.caseStatusId,
              caseStatusName: caseStatus.name,
            },
          });
        }
      } catch (error) {
        results.failed.push({
          personId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "add_people_to_collective_completed",
        entityType: "collectiveProcesses",
        entityId: args.collectiveProcessId,
        details: {
          totalProcessed: results.totalProcessed,
          successful: results.successful.length,
          failed: results.failed.length,
        },
      });
    }

    return results;
  },
});

/**
 * Mutation to update status of all individual processes in a collective process
 * Applies the same status update to all individual processes at once
 */
export const updateCollectiveProcessStatuses = mutation({
  args: {
    collectiveProcessId: v.id("collectiveProcesses"),
    caseStatusId: v.id("caseStatuses"),
    date: v.string(),
    notes: v.optional(v.string()),
    filledFieldsData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    const userProfile = await requireAdmin(ctx);

    // Verify collective process exists
    const collectiveProcess = await ctx.db.get(args.collectiveProcessId);
    if (!collectiveProcess) {
      throw new Error("Collective process not found");
    }

    // Verify case status exists
    const caseStatus = await ctx.db.get(args.caseStatusId);
    if (!caseStatus) {
      throw new Error("Case status not found");
    }

    // Get all individual processes for this collective
    const individualProcesses = await ctx.db
      .query("individualProcesses")
      .withIndex("by_collectiveProcess", (q) =>
        q.eq("collectiveProcessId", args.collectiveProcessId)
      )
      .collect();

    if (individualProcesses.length === 0) {
      throw new Error("No individual processes found in this collective process");
    }

    const results = {
      successful: [] as Id<"individualProcesses">[],
      failed: [] as { processId: Id<"individualProcesses">; reason: string }[],
      totalProcessed: individualProcesses.length,
    };

    const now = Date.now();

    // Process each individual process
    for (const process of individualProcesses) {
      try {
        // Deactivate old status records
        const oldStatuses = await ctx.db
          .query("individualProcessStatuses")
          .withIndex("by_individualProcess_active", (q) =>
            q.eq("individualProcessId", process._id).eq("isActive", true)
          )
          .collect();

        for (const oldStatus of oldStatuses) {
          await ctx.db.patch(oldStatus._id, { isActive: false });
        }

        // Create new status record
        if (userProfile.userId) {
          await ctx.db.insert("individualProcessStatuses", {
            individualProcessId: process._id,
            caseStatusId: args.caseStatusId,
            statusName: caseStatus.name,
            isActive: true,
            createdAt: now,
            changedAt: now,
            changedBy: userProfile.userId,
            notes: args.notes || "Bulk status update from collective process",
            date: args.date,
            filledFieldsData: args.filledFieldsData,
          });
        }

        // Update individual process with new case status
        const updateData: Record<string, unknown> = {
          caseStatusId: args.caseStatusId,
          status: caseStatus.code || "pending",
          updatedAt: now,
        };

        // Apply filled fields data to individual process if provided
        if (args.filledFieldsData && typeof args.filledFieldsData === "object") {
          Object.assign(updateData, args.filledFieldsData);
        }

        await ctx.db.patch(process._id, updateData);

        results.successful.push(process._id);

        // Log activity for each individual process update
        if (userProfile.userId) {
          const person = await ctx.db.get(process.personId);
          const oldCaseStatus = process.caseStatusId
            ? await ctx.db.get(process.caseStatusId)
            : null;

          await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
            userId: userProfile.userId,
            action: "collective_status_update",
            entityType: "individualProcesses",
            entityId: process._id,
            details: {
              personName: person?.fullName,
              previousCaseStatusId: process.caseStatusId,
              previousCaseStatusName: oldCaseStatus?.name,
              newCaseStatusId: args.caseStatusId,
              newCaseStatusName: caseStatus.name,
              collectiveProcessId: args.collectiveProcessId,
              notes: args.notes,
            },
          });
        }
      } catch (error) {
        results.failed.push({
          processId: process._id,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "collective_status_update_completed",
        entityType: "collectiveProcesses",
        entityId: args.collectiveProcessId,
        details: {
          newCaseStatusId: args.caseStatusId,
          newCaseStatusName: caseStatus.name,
          totalProcessed: results.totalProcessed,
          successful: results.successful.length,
          failed: results.failed.length,
        },
      });
    }

    return results;
  },
});
