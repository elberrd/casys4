import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Query to list all statuses for an individual process
 * Access control: Admins see all, clients see only their company's processes
 */
export const list = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Get the individual process to check access
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Check if the individual process belongs to the client's company
      if (!individualProcess.collectiveProcessId) {
        throw new Error("Individual process has no main process");
      }
      const collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
      if (!collectiveProcess || collectiveProcess.companyId !== userProfile.companyId) {
        throw new Error("Access denied: Process does not belong to your company");
      }
    }

    // Query all statuses for this individual process
    const statuses = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", args.individualProcessId)
      )
      .collect();

    // Enrich with user information
    const enrichedStatuses = await Promise.all(
      statuses.map(async (status) => {
        const changedByUser = await ctx.db.get(status.changedBy);
        const changedByProfile = changedByUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", changedByUser._id))
              .first()
          : null;

        return {
          ...status,
          changedByUser: changedByProfile
            ? {
                fullName: changedByProfile.fullName,
                email: changedByProfile.email,
              }
            : null,
        };
      })
    );

    return enrichedStatuses;
  },
});

/**
 * Query to get the currently active status for an individual process
 */
export const getActiveStatus = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Get the individual process to check access
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      if (!individualProcess.collectiveProcessId) {
        throw new Error("Individual process has no main process");
      }
      const collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
      if (!collectiveProcess || collectiveProcess.companyId !== userProfile.companyId) {
        throw new Error("Access denied: Process does not belong to your company");
      }
    }

    // Query for the active status
    const activeStatus = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess_active", (q) =>
        q.eq("individualProcessId", args.individualProcessId).eq("isActive", true)
      )
      .first();

    if (!activeStatus) {
      return null;
    }

    // Enrich with user information
    const changedByUser = await ctx.db.get(activeStatus.changedBy);
    const changedByProfile = changedByUser
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", changedByUser._id))
          .first()
      : null;

    return {
      ...activeStatus,
      changedByUser: changedByProfile
        ? {
            fullName: changedByProfile.fullName,
            email: changedByProfile.email,
          }
        : null,
    };
  },
});

/**
 * Query to get status history for an individual process (ordered oldest to newest)
 */
export const getStatusHistory = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Get the individual process to check access
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      if (!individualProcess.collectiveProcessId) {
        throw new Error("Individual process has no main process");
      }
      const collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
      if (!collectiveProcess || collectiveProcess.companyId !== userProfile.companyId) {
        throw new Error("Access denied: Process does not belong to your company");
      }
    }

    // Query all statuses
    const statuses = await ctx.db
      .query("individualProcessStatuses")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", args.individualProcessId)
      )
      .collect();

    // Sort by date field (YYYY-MM-DD) descending (most recent first)
    // Fall back to changedAt timestamp if date is not set
    const sortedStatuses = statuses.sort((a, b) => {
      const dateA = a.date || new Date(a.changedAt).toISOString().split('T')[0];
      const dateB = b.date || new Date(b.changedAt).toISOString().split('T')[0];
      return dateB.localeCompare(dateA); // Descending order
    });

    // Enrich with user information and case status details
    const enrichedStatuses = await Promise.all(
      sortedStatuses.map(async (status) => {
        const [changedByUser, caseStatus] = await Promise.all([
          ctx.db.get(status.changedBy),
          status.caseStatusId ? ctx.db.get(status.caseStatusId) : null,
        ]);

        const changedByProfile = changedByUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", changedByUser._id))
              .first()
          : null;

        return {
          ...status,
          changedByUser: changedByProfile
            ? {
                fullName: changedByProfile.fullName,
                email: changedByProfile.email,
              }
            : null,
          caseStatus, // NEW: Include full case status object with name, nameEn, color, etc.
        };
      })
    );

    return enrichedStatuses;
  },
});

/**
 * Mutation to add a new status to an individual process
 * Admin only - deactivates previous active status
 */
export const addStatus = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    caseStatusId: v.id("caseStatuses"), // Required: Reference to case status
    date: v.optional(v.string()), // Optional: ISO date YYYY-MM-DD, defaults to today
    statusName: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    filledFieldsData: v.optional(v.any()), // Optional: Data for fillable fields
  },
  handler: async (ctx, args) => {
    // Require admin access
    await requireAdmin(ctx);

    // Get current user ID
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Verify the individual process exists
    const individualProcess = await ctx.db.get(args.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Validate that case status exists
    const caseStatus = await ctx.db.get(args.caseStatusId);
    if (!caseStatus) {
      throw new Error("Case status not found");
    }

    // Validate filled fields data if provided
    if (args.filledFieldsData && caseStatus.fillableFields) {
      const fillableFieldNames = caseStatus.fillableFields;
      const providedFieldNames = Object.keys(args.filledFieldsData);

      // Check that all provided fields are in the fillableFields list
      for (const fieldName of providedFieldNames) {
        if (!fillableFieldNames.includes(fieldName)) {
          throw new Error(`Field "${fieldName}" is not a fillable field for this status`);
        }
      }
    }

    const now = Date.now();
    const isActive = args.isActive ?? true;

    // Default date to current date if not provided
    const statusDate = args.date || new Date(now).toISOString().split('T')[0];

    // Validate date format (YYYY-MM-DD)
    if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD");
    }

    // If this new status is active, deactivate all other statuses
    if (isActive) {
      const existingStatuses = await ctx.db
        .query("individualProcessStatuses")
        .withIndex("by_individualProcess_active", (q) =>
          q.eq("individualProcessId", args.individualProcessId).eq("isActive", true)
        )
        .collect();

      // Deactivate all existing active statuses
      for (const status of existingStatuses) {
        await ctx.db.patch(status._id, { isActive: false });
      }
    }

    // Create the new status record
    const statusId = await ctx.db.insert("individualProcessStatuses", {
      individualProcessId: args.individualProcessId,
      caseStatusId: args.caseStatusId, // Store case status ID
      statusName: args.statusName || caseStatus.name, // DEPRECATED: Backward compatibility
      date: statusDate, // ISO date format YYYY-MM-DD
      isActive,
      notes: args.notes,
      fillableFields: caseStatus.fillableFields, // Copy fillable fields from case status
      filledFieldsData: args.filledFieldsData, // Store filled fields data
      changedBy: userId,
      changedAt: now,
      createdAt: now,
    });

    // Update individual process with filled fields data if provided
    if (args.filledFieldsData && Object.keys(args.filledFieldsData).length > 0) {
      // Merge filled fields data with existing individual process data
      const updateData: any = { updatedAt: now };

      for (const [key, value] of Object.entries(args.filledFieldsData)) {
        updateData[key] = value;
      }

      await ctx.db.patch(args.individualProcessId, updateData);
    }

    // Sync "em preparação" status date to dateProcess
    if (caseStatus.code === "em_preparacao" && isActive) {
      await ctx.db.patch(args.individualProcessId, {
        dateProcess: statusDate,
        updatedAt: now,
      });
    }

    // Update the backward compatibility field in individualProcesses
    if (isActive) {
      await ctx.db.patch(args.individualProcessId, {
        caseStatusId: args.caseStatusId, // Update to new case status
        status: caseStatus.code, // DEPRECATED: Update backward compatibility field
        updatedAt: now,
      });
    }

    // Log activity
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId,
      action: "status_added",
      entityType: "individualProcessStatus",
      entityId: statusId,
      details: {
        individualProcessId: args.individualProcessId,
        caseStatusName: caseStatus.name,
        caseStatusId: args.caseStatusId,
        date: statusDate,
        isActive,
      },
    });

    return statusId;
  },
});

/**
 * Mutation to update an existing status record
 * Admin only
 */
export const updateStatus = mutation({
  args: {
    statusId: v.id("individualProcessStatuses"),
    caseStatusId: v.optional(v.id("caseStatuses")),
    date: v.optional(v.string()), // Optional: ISO date YYYY-MM-DD
    statusName: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin access
    await requireAdmin(ctx);

    // Get current user ID
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Get the status record
    const status = await ctx.db.get(args.statusId);
    if (!status) {
      throw new Error("Status record not found");
    }

    // Validate date format if provided (YYYY-MM-DD)
    if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD");
    }

    // Get case status if caseStatusId is provided
    let caseStatus = null;
    if (args.caseStatusId) {
      caseStatus = await ctx.db.get(args.caseStatusId);
      if (!caseStatus) {
        throw new Error("Case status not found");
      }
    }

    const now = Date.now();

    // If changing to active, deactivate other statuses
    if (args.isActive === true && !status.isActive) {
      const existingStatuses = await ctx.db
        .query("individualProcessStatuses")
        .withIndex("by_individualProcess_active", (q) =>
          q.eq("individualProcessId", status.individualProcessId).eq("isActive", true)
        )
        .collect();

      for (const existingStatus of existingStatuses) {
        await ctx.db.patch(existingStatus._id, { isActive: false });
      }
    }

    // Update the status record
    const updates: {
      caseStatusId?: Id<"caseStatuses">;
      date?: string;
      statusName?: string;
      notes?: string;
      isActive?: boolean;
      fillableFields?: string[];
    } = {};
    if (args.caseStatusId !== undefined) {
      updates.caseStatusId = args.caseStatusId;
      // Update backward compatibility fields
      if (caseStatus) {
        updates.statusName = caseStatus.name;
        // Update fillable fields from new caseStatus
        updates.fillableFields = caseStatus.fillableFields;
      }
    }
    if (args.date !== undefined) updates.date = args.date;
    if (args.statusName !== undefined) updates.statusName = args.statusName;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.statusId, updates);

    // Sync "em preparação" status date changes back to dateProcess
    if (args.date !== undefined) {
      // Get the case status to check if this is "em preparação"
      const currentCaseStatus = await ctx.db.get(status.caseStatusId);
      if (currentCaseStatus && currentCaseStatus.code === "em_preparacao") {
        // Update the individualProcess dateProcess
        await ctx.db.patch(status.individualProcessId, {
          dateProcess: args.date,
          updatedAt: now,
        });
      }
    }

    // Update parent individualProcess if this is the active status
    const isActiveStatus = args.isActive === true || status.isActive;
    if (isActiveStatus && (args.caseStatusId !== undefined || args.statusName !== undefined)) {
      const parentUpdates: {
        caseStatusId?: Id<"caseStatuses">;
        status?: string;
        updatedAt: number;
      } = {
        updatedAt: now,
      };

      if (args.caseStatusId !== undefined && caseStatus) {
        parentUpdates.caseStatusId = args.caseStatusId;
        parentUpdates.status = caseStatus.name;
      } else if (args.statusName !== undefined) {
        parentUpdates.status = args.statusName;
      }

      await ctx.db.patch(status.individualProcessId, parentUpdates);
    }

    // Log activity with old and new values
    const activityDetails: {
      individualProcessId: Id<"individualProcesses">;
      oldValues: {
        caseStatusId?: Id<"caseStatuses">;
        caseStatusName?: string;
        date?: string;
        notes?: string;
        isActive?: boolean;
      };
      newValues: typeof updates;
    } = {
      individualProcessId: status.individualProcessId,
      oldValues: {},
      newValues: updates,
    };

    // Get old case status name if changed
    if (args.caseStatusId !== undefined && status.caseStatusId) {
      const oldCaseStatus = await ctx.db.get(status.caseStatusId);
      activityDetails.oldValues.caseStatusId = status.caseStatusId;
      activityDetails.oldValues.caseStatusName = oldCaseStatus?.name;
    }
    if (args.date !== undefined) {
      activityDetails.oldValues.date = status.date;
    }
    if (args.notes !== undefined) {
      activityDetails.oldValues.notes = status.notes;
    }
    if (args.isActive !== undefined) {
      activityDetails.oldValues.isActive = status.isActive;
    }

    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId,
      action: "status_updated",
      entityType: "individualProcessStatus",
      entityId: args.statusId,
      details: activityDetails,
    });

    return args.statusId;
  },
});

/**
 * Mutation to delete a status record
 * Admin only - can delete any status including active
 */
export const deleteStatus = mutation({
  args: {
    statusId: v.id("individualProcessStatuses"),
  },
  handler: async (ctx, args) => {
    // Require admin access
    await requireAdmin(ctx);

    // Get current user ID
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Get the status record
    const status = await ctx.db.get(args.statusId);
    if (!status) {
      throw new Error("Status record not found");
    }

    // Get the case status to check fillable fields
    const caseStatus = status.caseStatusId
      ? await ctx.db.get(status.caseStatusId)
      : null;

    // Prepare updates for individual process
    const now = Date.now();
    const updates: any = { updatedAt: now };

    // If deleting the active status, clear active status reference
    if (status.isActive) {
      updates.caseStatusId = undefined;
      updates.status = undefined;
    }

    // Clear fillable fields data that was set by this status
    // This ensures that when a status is deleted, its associated data is cleaned up
    const fillableFields = status.fillableFields || caseStatus?.fillableFields || [];
    if (fillableFields.length > 0 && status.filledFieldsData) {
      // Clear only the fields that were filled by this specific status
      const filledFields = Object.keys(status.filledFieldsData);
      for (const fieldName of filledFields) {
        if (fillableFields.includes(fieldName)) {
          updates[fieldName] = undefined;
        }
      }
    }

    // Update the individual process
    if (Object.keys(updates).length > 1) { // More than just updatedAt
      await ctx.db.patch(status.individualProcessId, updates);
    }

    // Delete the status record
    await ctx.db.delete(args.statusId);

    // Log activity
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId,
      action: "status_deleted",
      entityType: "individualProcessStatus",
      entityId: args.statusId,
      details: {
        individualProcessId: status.individualProcessId,
        statusName: status.statusName,
      },
    });

    return { success: true };
  },
});

/**
 * Mutation to update fillable fields configuration for a status
 * Access control: Admin only
 */
export const updateFillableFields = mutation({
  args: {
    statusId: v.id("individualProcessStatuses"),
    fillableFields: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get the status record
    const status = await ctx.db.get(args.statusId);
    if (!status) {
      throw new Error("Status not found");
    }

    // Validate field names against metadata (additional runtime check)
    const validFieldNames = [
      "passportId", "applicantId", "processTypeId", "legalFrameworkId", "cboId",
      "mreOfficeNumber", "douNumber", "douSection", "douPage", "douDate",
      "protocolNumber", "rnmNumber", "rnmDeadline", "appointmentDateTime", "deadlineDate"
    ];

    if (args.fillableFields) {
      const invalidFields = args.fillableFields.filter(
        (name) => !validFieldNames.includes(name)
      );
      if (invalidFields.length > 0) {
        throw new Error(`Invalid field names: ${invalidFields.join(", ")}`);
      }
    }

    // Update the status record
    await ctx.db.patch(args.statusId, {
      fillableFields: args.fillableFields,
    });

    // Log activity
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId,
      action: "fillable_fields_updated",
      entityType: "individualProcessStatus",
      entityId: args.statusId,
      details: {
        fillableFields: args.fillableFields,
      },
    });

    return { success: true };
  },
});

/**
 * Mutation to save filled field data
 * Access control: Both admin and client (if they have access to the process)
 */
export const saveFilledFields = mutation({
  args: {
    statusId: v.id("individualProcessStatuses"),
    filledFieldsData: v.any(), // Flexible object for field data
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    // Get the status record
    const status = await ctx.db.get(args.statusId);
    if (!status) {
      throw new Error("Status not found");
    }

    // Get the individual process to check access
    const individualProcess = await ctx.db.get(status.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      if (!individualProcess.collectiveProcessId) {
        throw new Error("Individual process has no main process");
      }
      const collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
      if (!collectiveProcess || collectiveProcess.companyId !== userProfile.companyId) {
        throw new Error("Access denied: Process does not belong to your company");
      }
    }

    // Get fillable fields - prioritize status record, fallback to case status
    let fillableFields = status.fillableFields || [];

    // If status doesn't have fillableFields, get them from the case status
    if ((!fillableFields || fillableFields.length === 0) && status.caseStatusId) {
      const caseStatus = await ctx.db.get(status.caseStatusId);
      if (caseStatus && caseStatus.fillableFields) {
        fillableFields = caseStatus.fillableFields;
      }
    }

    // Validate that only fillable fields are being filled
    const filledFieldKeys = Object.keys(args.filledFieldsData);
    const invalidKeys = filledFieldKeys.filter(
      (key) => !fillableFields.includes(key)
    );

    if (invalidKeys.length > 0) {
      throw new Error(`Cannot fill fields that are not configured as fillable: ${invalidKeys.join(", ")}`);
    }

    // Update the status record with filled data
    await ctx.db.patch(args.statusId, {
      filledFieldsData: args.filledFieldsData,
    });

    // Also update the individual process record with the filled values
    const updateData: any = {};
    for (const [key, value] of Object.entries(args.filledFieldsData)) {
      updateData[key] = value;
    }

    if (Object.keys(updateData).length > 0) {
      await ctx.db.patch(status.individualProcessId, updateData);
    }

    // Log activity
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId,
      action: "filled_fields_saved",
      entityType: "individualProcessStatus",
      entityId: args.statusId,
      details: {
        filledFields: filledFieldKeys,
      },
    });

    return { success: true };
  },
});

/**
 * Query to get fillable fields metadata for a status
 * Returns array of field metadata for fields that can be filled
 * Falls back to case status fillableFields if status record doesn't have them
 */
export const getFillableFields = query({
  args: {
    statusId: v.id("individualProcessStatuses"),
  },
  handler: async (ctx, args) => {
    // Get the status record
    const status = await ctx.db.get(args.statusId);
    if (!status) {
      throw new Error("Status not found");
    }

    // Get the individual process to check access
    const individualProcess = await ctx.db.get(status.individualProcessId);
    if (!individualProcess) {
      throw new Error("Individual process not found");
    }

    // Apply role-based access control if authenticated
    const userId = await getAuthUserId(ctx);
    if (userId !== null) {
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

      if (userProfile && userProfile.role === "client") {
        if (!userProfile.companyId) {
          throw new Error("Client user must have a company assignment");
        }

        if (!individualProcess.collectiveProcessId) {
          throw new Error("Individual process has no main process");
        }
        const collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
        if (!collectiveProcess || collectiveProcess.companyId !== userProfile.companyId) {
          throw new Error("Access denied: Process does not belong to your company");
        }
      }
    }

    // Get fillable fields - prioritize status record, fallback to case status
    let fillableFields = status.fillableFields || [];

    // If status doesn't have fillableFields, get them from the case status
    if ((!fillableFields || fillableFields.length === 0) && status.caseStatusId) {
      const caseStatus = await ctx.db.get(status.caseStatusId);
      if (caseStatus && caseStatus.fillableFields) {
        fillableFields = caseStatus.fillableFields;
      }
    }

    // Get current values from the individualProcess record
    // This ensures we show existing data even if it wasn't saved via this specific status record
    const currentValues: Record<string, any> = {};
    for (const fieldName of fillableFields) {
      const value = (individualProcess as any)[fieldName];
      if (value !== undefined && value !== null && value !== "") {
        currentValues[fieldName] = value;
      }
    }

    // Merge with status record's filledFieldsData (status record takes priority)
    const mergedData = {
      ...currentValues,
      ...(status.filledFieldsData || {}),
    };

    // Return fillable fields configuration with current values
    return {
      fillableFields,
      filledFieldsData: mergedData,
    };
  },
});
