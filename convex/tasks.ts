import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { internal } from "./_generated/api";
import { normalizeString } from "./lib/stringUtils";

function getFullName(person: { givenNames?: string; fullName?: string; middleName?: string; surname?: string }): string {
  return [person.givenNames || person.fullName || "", person.middleName, person.surname].filter(Boolean).join(" ");
}

/**
 * Query to list all tasks with optional filters
 * Access control: Admins see all tasks, clients see tasks for their assigned processes
 */
export const list = query({
  args: {
    individualProcessId: v.optional(v.id("individualProcesses")),
    collectiveProcessId: v.optional(v.id("collectiveProcesses")),
    assignedTo: v.optional(v.id("users")),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    overdue: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    let results;

    // Apply filters based on args
    if (args.individualProcessId !== undefined) {
      const individualProcessId = args.individualProcessId;
      results = await ctx.db
        .query("tasks")
        .withIndex("by_individualProcess", (q) =>
          q.eq("individualProcessId", individualProcessId)
        )
        .collect();
    } else if (args.collectiveProcessId !== undefined) {
      const collectiveProcessId = args.collectiveProcessId;
      results = await ctx.db
        .query("tasks")
        .withIndex("by_collectiveProcess", (q) =>
          q.eq("collectiveProcessId", collectiveProcessId)
        )
        .collect();
    } else if (args.assignedTo !== undefined) {
      const assignedTo = args.assignedTo;
      results = await ctx.db
        .query("tasks")
        .withIndex("by_assignedTo", (q) =>
          q.eq("assignedTo", assignedTo)
        )
        .collect();
    } else if (args.status !== undefined) {
      const status = args.status;
      results = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else if (args.priority !== undefined) {
      const priority = args.priority;
      results = await ctx.db
        .query("tasks")
        .withIndex("by_priority", (q) => q.eq("priority", priority))
        .collect();
    } else if (args.dueDate !== undefined) {
      const dueDate = args.dueDate;
      results = await ctx.db
        .query("tasks")
        .withIndex("by_dueDate", (q) => q.eq("dueDate", dueDate))
        .collect();
    } else {
      results = await ctx.db.query("tasks").collect();
    }

    // Apply additional filters
    let filteredResults = results;

    if (args.status !== undefined && args.individualProcessId === undefined && args.collectiveProcessId === undefined && args.assignedTo === undefined) {
      filteredResults = filteredResults.filter((r) => r.status === args.status);
    }

    if (args.priority !== undefined && args.individualProcessId === undefined && args.collectiveProcessId === undefined && args.assignedTo === undefined) {
      filteredResults = filteredResults.filter((r) => r.priority === args.priority);
    }

    // Filter for overdue tasks
    if (args.overdue) {
      const today = new Date().toISOString().split("T")[0];
      filteredResults = filteredResults.filter(
        (task) =>
          task.status !== "completed" &&
          task.status !== "cancelled" &&
          task.dueDate && task.dueDate < today
      );
    }

    // Apply role-based access control for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Filter tasks by company - check collectiveProcess.companyId or individualProcess.collectiveProcess.companyId
      const filteredByCompany = await Promise.all(
        filteredResults.map(async (task) => {
          // Check collectiveProcess directly
          if (task.collectiveProcessId) {
            const collectiveProcess = await ctx.db.get(task.collectiveProcessId);
            if (collectiveProcess && collectiveProcess.companyId === userProfile.companyId) {
              return task;
            }
          }

          // Check individualProcess's collectiveProcess
          if (task.individualProcessId) {
            const individualProcess = await ctx.db.get(task.individualProcessId);
            if (individualProcess && individualProcess.collectiveProcessId) {
              const collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
              if (collectiveProcess && collectiveProcess.companyId === userProfile.companyId) {
                return task;
              }
            }
          }

          return null;
        })
      );

      filteredResults = filteredByCompany.filter((t) => t !== null) as typeof filteredResults;
    }

    // Enrich with related data
    const enrichedResults = await Promise.all(
      filteredResults.map(async (task) => {
        const [individualProcess, collectiveProcess, assignedToUser, createdByUser, completedByUser] =
          await Promise.all([
            task.individualProcessId ? ctx.db.get(task.individualProcessId) : null,
            task.collectiveProcessId ? ctx.db.get(task.collectiveProcessId) : null,
            task.assignedTo ? ctx.db.get(task.assignedTo) : null,
            ctx.db.get(task.createdBy),
            task.completedBy ? ctx.db.get(task.completedBy) : null,
          ]);

        // Get assignedTo user profile
        const assignedToProfile = assignedToUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", assignedToUser._id))
              .first()
          : null;

        // Get createdBy user profile
        const createdByProfile = createdByUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", createdByUser._id))
              .first()
          : null;

        // Get completedBy user profile
        const completedByProfile = completedByUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", completedByUser._id))
              .first()
          : null;

        // Get person from individualProcess
        let person = null;
        if (individualProcess) {
          person = await ctx.db.get(individualProcess.personId);
        }

        return {
          ...task,
          individualProcess: individualProcess
            ? {
                _id: individualProcess._id,
                status: individualProcess.status,
                person: person
                  ? {
                      _id: person._id,
                      fullName: getFullName(person),
                    }
                  : null,
              }
            : null,
          collectiveProcess: collectiveProcess
            ? {
                _id: collectiveProcess._id,
                referenceNumber: collectiveProcess.referenceNumber,
                status: collectiveProcess.status,
              }
            : null,
          assignedToUser: assignedToProfile
            ? {
                _id: assignedToProfile._id,
                userId: assignedToProfile.userId,
                fullName: assignedToProfile.fullName,
                email: assignedToProfile.email,
              }
            : null,
          createdByUser: createdByProfile
            ? {
                _id: createdByProfile._id,
                userId: createdByProfile.userId,
                fullName: createdByProfile.fullName,
                email: createdByProfile.email,
              }
            : null,
          completedByUser: completedByProfile
            ? {
                _id: completedByProfile._id,
                userId: completedByProfile.userId,
                fullName: completedByProfile.fullName,
                email: completedByProfile.email,
              }
            : null,
        };
      })
    );

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      return enrichedResults.filter((task) => {
        const title = normalizeString(task.title);
        const description = task.description ? normalizeString(task.description) : "";

        return (
          title.includes(searchNormalized) ||
          description.includes(searchNormalized)
        );
      });
    }

    return enrichedResults;
  },
});

/**
 * Query to get a single task by ID
 */
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const task = await ctx.db.get(id);

    if (!task) {
      return null;
    }

    // Apply role-based access control for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Check collectiveProcess directly
      if (task.collectiveProcessId) {
        const collectiveProcess = await ctx.db.get(task.collectiveProcessId);
        if (!collectiveProcess || collectiveProcess.companyId !== userProfile.companyId) {
          throw new Error("Access denied: Task does not belong to your company");
        }
      }

      // Check individualProcess's collectiveProcess
      if (task.individualProcessId) {
        const individualProcess = await ctx.db.get(task.individualProcessId);
        if (individualProcess && individualProcess.collectiveProcessId) {
          const collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
          if (!collectiveProcess || collectiveProcess.companyId !== userProfile.companyId) {
            throw new Error("Access denied: Task does not belong to your company");
          }
        }
      }
    }

    // Enrich with related data
    const [individualProcess, collectiveProcess, assignedToUser, createdByUser, completedByUser] =
      await Promise.all([
        task.individualProcessId ? ctx.db.get(task.individualProcessId) : null,
        task.collectiveProcessId ? ctx.db.get(task.collectiveProcessId) : null,
        task.assignedTo ? ctx.db.get(task.assignedTo) : null,
        ctx.db.get(task.createdBy),
        task.completedBy ? ctx.db.get(task.completedBy) : null,
      ]);

    // Get user profiles
    const assignedToProfile = assignedToUser
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", assignedToUser._id))
          .first()
      : null;

    const createdByProfile = createdByUser
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", createdByUser._id))
          .first()
      : null;

    const completedByProfile = completedByUser
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", completedByUser._id))
          .first()
      : null;

    // Get person from individualProcess
    let person = null;
    if (individualProcess) {
      person = await ctx.db.get(individualProcess.personId);
    }

    return {
      ...task,
      individualProcess: individualProcess
        ? {
            _id: individualProcess._id,
            status: individualProcess.status,
            person: person
              ? {
                  _id: person._id,
                  fullName: getFullName(person),
                }
              : null,
          }
        : null,
      collectiveProcess: collectiveProcess
        ? {
            _id: collectiveProcess._id,
            referenceNumber: collectiveProcess.referenceNumber,
            status: collectiveProcess.status,
          }
        : null,
      assignedToUser: assignedToProfile
        ? {
            _id: assignedToProfile._id,
            userId: assignedToProfile.userId,
            fullName: assignedToProfile.fullName,
            email: assignedToProfile.email,
          }
        : null,
      createdByUser: createdByProfile
        ? {
            _id: createdByProfile._id,
            userId: createdByProfile.userId,
            fullName: createdByProfile.fullName,
            email: createdByProfile.email,
          }
        : null,
      completedByUser: completedByProfile
        ? {
            _id: completedByProfile._id,
            userId: completedByProfile.userId,
            fullName: completedByProfile.fullName,
            email: completedByProfile.email,
          }
        : null,
    };
  },
});

/**
 * Query to get tasks assigned to the current user
 */
export const getMyTasks = query({
  args: {
    status: v.optional(v.string()),
    overdue: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Query tasks assigned to current user
    let results = await ctx.db
      .query("tasks")
      .withIndex("by_assignedTo", (q) => q.eq("assignedTo", userProfile.userId))
      .collect();

    // Apply status filter
    if (args.status) {
      results = results.filter((task) => task.status === args.status);
    }

    // Filter for overdue tasks
    if (args.overdue) {
      const today = new Date().toISOString().split("T")[0];
      results = results.filter(
        (task) =>
          task.status !== "completed" &&
          task.status !== "cancelled" &&
          task.dueDate && task.dueDate < today
      );
    }

    // Enrich with related data
    const enrichedResults = await Promise.all(
      results.map(async (task) => {
        const [individualProcess, collectiveProcess, createdByUser] = await Promise.all([
          task.individualProcessId ? ctx.db.get(task.individualProcessId) : null,
          task.collectiveProcessId ? ctx.db.get(task.collectiveProcessId) : null,
          ctx.db.get(task.createdBy),
        ]);

        const createdByProfile = createdByUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", createdByUser._id))
              .first()
          : null;

        // Get person from individualProcess
        let person = null;
        if (individualProcess) {
          person = await ctx.db.get(individualProcess.personId);
        }

        return {
          ...task,
          individualProcess: individualProcess
            ? {
                _id: individualProcess._id,
                status: individualProcess.status,
                person: person
                  ? {
                      _id: person._id,
                      fullName: getFullName(person),
                    }
                  : null,
              }
            : null,
          collectiveProcess: collectiveProcess
            ? {
                _id: collectiveProcess._id,
                referenceNumber: collectiveProcess.referenceNumber,
                status: collectiveProcess.status,
              }
            : null,
          createdByUser: createdByProfile
            ? {
                _id: createdByProfile._id,
                userId: createdByProfile.userId,
                fullName: createdByProfile.fullName,
                email: createdByProfile.email,
              }
            : null,
        };
      })
    );

    return enrichedResults;
  },
});

/**
 * Query to get overdue tasks
 * Admin only - returns all overdue tasks in the system
 */
export const getOverdueTasks = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const today = new Date().toISOString().split("T")[0];

    // Get all tasks that are overdue and not completed/cancelled
    const results = await ctx.db.query("tasks").collect();

    const overdueTasks = results.filter(
      (task) =>
        task.status !== "completed" &&
        task.status !== "cancelled" &&
        task.dueDate && task.dueDate < today
    );

    // Enrich with related data
    const enrichedResults = await Promise.all(
      overdueTasks.map(async (task) => {
        const [individualProcess, collectiveProcess, assignedToUser] = await Promise.all([
          task.individualProcessId ? ctx.db.get(task.individualProcessId) : null,
          task.collectiveProcessId ? ctx.db.get(task.collectiveProcessId) : null,
          task.assignedTo ? ctx.db.get(task.assignedTo) : null,
        ]);

        const assignedToProfile = assignedToUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", assignedToUser._id))
              .first()
          : null;

        // Get person from individualProcess
        let person = null;
        if (individualProcess) {
          person = await ctx.db.get(individualProcess.personId);
        }

        return {
          ...task,
          individualProcess: individualProcess
            ? {
                _id: individualProcess._id,
                status: individualProcess.status,
                person: person
                  ? {
                      _id: person._id,
                      fullName: getFullName(person),
                    }
                  : null,
              }
            : null,
          collectiveProcess: collectiveProcess
            ? {
                _id: collectiveProcess._id,
                referenceNumber: collectiveProcess.referenceNumber,
                status: collectiveProcess.status,
              }
            : null,
          assignedToUser: assignedToProfile
            ? {
                _id: assignedToProfile._id,
                userId: assignedToProfile.userId,
                fullName: assignedToProfile.fullName,
                email: assignedToProfile.email,
              }
            : null,
        };
      })
    );

    return enrichedResults;
  },
});

/**
 * Create a new task
 * Admin only
 */
export const create = mutation({
  args: {
    individualProcessId: v.optional(v.id("individualProcesses")),
    collectiveProcessId: v.optional(v.id("collectiveProcesses")),
    title: v.string(),
    description: v.string(),
    dueDate: v.optional(v.string()),
    priority: v.string(),
    assignedTo: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    // Validate that at least one process ID is provided
    if (!args.individualProcessId && !args.collectiveProcessId) {
      throw new Error("Either individualProcessId or collectiveProcessId must be provided");
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (!validPriorities.includes(args.priority)) {
      throw new Error("Invalid priority value");
    }

    // Validate assignedTo user exists
    const assignedToUser = await ctx.db.get(args.assignedTo);
    if (!assignedToUser) {
      throw new Error("Assigned user not found");
    }

    const now = Date.now();

    const taskId = await ctx.db.insert("tasks", {
      individualProcessId: args.individualProcessId,
      collectiveProcessId: args.collectiveProcessId,
      title: args.title,
      description: args.description,
      dueDate: args.dueDate,
      priority: args.priority,
      status: "todo",
      assignedTo: args.assignedTo,
      createdBy: userProfile.userId!,
      createdAt: now,
      updatedAt: now,
    });

    // Send notification to assigned user
    try {
      await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
        userId: args.assignedTo,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `You have been assigned a new task: "${args.title}" (Due: ${args.dueDate})`,
        entityType: "task",
        entityId: taskId,
      });
    } catch (error) {
      console.error("Failed to create task assignment notification:", error);
    }

    // Log activity (non-blocking)
    try {
      const [individualProcess, collectiveProcess, assignedToUser] = await Promise.all([
        args.individualProcessId ? ctx.db.get(args.individualProcessId) : null,
        args.collectiveProcessId ? ctx.db.get(args.collectiveProcessId) : null,
        ctx.db.get(args.assignedTo),
      ]);

      const assignedToProfile = assignedToUser
        ? await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", assignedToUser._id))
            .first()
        : null;

    if (!userProfile.userId) throw new Error("User must be activated");
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "task",
        entityId: taskId,
        details: {
          title: args.title,
          priority: args.priority,
          dueDate: args.dueDate,
          assignedTo: assignedToProfile?.fullName,
          collectiveProcessReference: collectiveProcess?.referenceNumber,
          individualProcessId: args.individualProcessId,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return taskId;
  },
});

/**
 * Update an existing task
 * Admin only
 */
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    // Validate priority if provided
    if (args.priority) {
      const validPriorities = ["low", "medium", "high", "urgent"];
      if (!validPriorities.includes(args.priority)) {
        throw new Error("Invalid priority value");
      }
    }

    // Validate status if provided
    if (args.status) {
      const validStatuses = ["todo", "in_progress", "completed", "cancelled"];
      if (!validStatuses.includes(args.status)) {
        throw new Error("Invalid status value");
      }
    }

    // Validate assignedTo user if provided
    if (args.assignedTo) {
      const assignedToUser = await ctx.db.get(args.assignedTo);
      if (!assignedToUser) {
        throw new Error("Assigned user not found");
      }
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.dueDate !== undefined) updateData.dueDate = args.dueDate;
    if (args.priority !== undefined) updateData.priority = args.priority;
    if (args.status !== undefined) updateData.status = args.status;
    if (args.assignedTo !== undefined) updateData.assignedTo = args.assignedTo;

    await ctx.db.patch(args.id, updateData);

    // Log activity with before/after values (non-blocking)
    try {
      const changedFields: Record<string, { before: any; after: any }> = {};
      Object.keys(updateData).forEach((key) => {
        if (key !== "updatedAt" && updateData[key] !== task[key as keyof typeof task]) {
          changedFields[key] = {
            before: task[key as keyof typeof task],
            after: updateData[key],
          };
        }
      });

    if (!userProfile.userId) throw new Error("User must be activated");
      if (Object.keys(changedFields).length > 0) {
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: args.status && args.status !== task.status ? "status_changed" : "updated",
          entityType: "task",
          entityId: args.id,
          details: {
            title: task.title,
            changes: changedFields,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return args.id;
  },
});

/**
 * Mark a task as completed
 * Admin only
 */
export const complete = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userProfile = await requireAdmin(ctx);

    const task = await ctx.db.get(id);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(id, {
      status: "completed",
      completedAt: Date.now(),
      completedBy: userProfile.userId,
      updatedAt: Date.now(),
    });

    if (!userProfile.userId) throw new Error("User must be activated");
    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "completed",
        entityType: "task",
        entityId: id,
        details: {
          title: task.title,
          previousStatus: task.status,
          newStatus: "completed",
          dueDate: task.dueDate,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Reassign a task to a different user
 * Admin only
 */
export const reassign = mutation({
  args: {
    id: v.id("tasks"),
    assignedTo: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);

    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    // Validate assignedTo user exists
    const assignedToUser = await ctx.db.get(args.assignedTo);
    if (!assignedToUser) {
      throw new Error("Assigned user not found");
    }

    // Get previous and new assignee details
    const [previousAssignee, newAssignee] = await Promise.all([
      task.assignedTo ? ctx.db.get(task.assignedTo) : null,
      assignedToUser,
    ]);

    const [previousProfile, newProfile] = await Promise.all([
      previousAssignee
        ? ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", previousAssignee._id))
            .first()
        : null,
      ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", newAssignee._id))
        .first(),
    ]);

    await ctx.db.patch(args.id, {
      assignedTo: args.assignedTo,
      updatedAt: Date.now(),
    });

    // Send notification to newly assigned user
    try {
      await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
        userId: args.assignedTo,
        type: "task_assigned",
        title: "Task Reassigned to You",
        message: `A task has been reassigned to you: "${task.title}" (Due: ${task.dueDate})`,
        entityType: "task",
        entityId: args.id,
      });
    } catch (error) {
      console.error("Failed to create task reassignment notification:", error);
    }
    if (!userProfile.userId) throw new Error("User must be activated");

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "reassigned",
        entityType: "task",
        entityId: args.id,
        details: {
          title: task.title,
          previousAssignee: previousProfile?.fullName,
          newAssignee: newProfile?.fullName,
          dueDate: task.dueDate,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return args.id;
  },
});

/**
 * Extend the deadline of a task
 * Admin only
 */
export const extendDeadline = mutation({
  args: {
    id: v.id("tasks"),
    newDueDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.id, {
      dueDate: args.newDueDate,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Delete a task
 * Admin only
 */
export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userProfile = await requireAdmin(ctx);

    const task = await ctx.db.get(id);
    if (!task) {
      throw new Error("Task not found");
    }

    if (!userProfile.userId) throw new Error("User must be activated");
    await ctx.db.delete(id);

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "task",
        entityId: id,
        details: {
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});

/**
 * Bulk create tasks for multiple individual processes (admin only)
 */
export const bulkCreateTasks = mutation({
  args: {
    individualProcessIds: v.array(v.id("individualProcesses")),
    title: v.string(),
    description: v.string(),
    dueDate: v.string(),
    priority: v.string(),
    assignedToId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Require admin access
    const adminProfile = await requireAdmin(ctx);

    // Validate required fields
    if (!args.title || args.title.trim() === "") {
      throw new Error("Task title is required");
    }

    if (args.individualProcessIds.length === 0) {
      throw new Error("At least one individual process must be selected");
    }

    // Determine assignee (use provided or default to current admin)
    const assignedToId = args.assignedToId || adminProfile.userId;

    // Verify assignee exists and is admin
    if (args.assignedToId) {
      const assigneeId = args.assignedToId; // Type narrowing
      const assigneeProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", assigneeId))
        .first();

      if (!assigneeProfile) {
        throw new Error("Assignee not found");
      }

      if (assigneeProfile.role !== "admin") {
        throw new Error("Tasks can only be assigned to admin users");
      }
    }

    const results = {
      successful: [] as Id<"tasks">[],
      failed: [] as { processId: Id<"individualProcesses">; reason: string }[],
      totalProcessed: args.individualProcessIds.length,
    };

    const now = Date.now();

    // Create task for each individual process
    for (const processId of args.individualProcessIds) {
      try {
        // Verify individual process exists
        const individualProcess = await ctx.db.get(processId);
        if (!individualProcess) {
          results.failed.push({
            processId,
            reason: "Individual process not found",
          });
          continue;
        }

        // Create task
        const taskId = await ctx.db.insert("tasks", {
          individualProcessId: processId,
          collectiveProcessId: individualProcess.collectiveProcessId,
          title: args.title,
          description: args.description,
          dueDate: args.dueDate,
          priority: args.priority,
          status: "todo",
          assignedTo: assignedToId,
          createdBy: adminProfile.userId!,
          createdAt: now,
          updatedAt: now,
        });

        results.successful.push(taskId);

        // Get person for logging
        const person = await ctx.db.get(individualProcess.personId);

        // Log activity (non-blocking)
        try {
          await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
            userId: adminProfile.userId!,
            action: "bulk_create_task",
            entityType: "task",
            entityId: taskId,
            details: {
              title: args.title,
              personName: person ? getFullName(person) : undefined,
              dueDate: args.dueDate,
              priority: args.priority,
            },
          });
        } catch (error) {
          console.error("Failed to log activity:", error);
        }

        // Send notification to assignee if not self-assigning (non-blocking)
        if (assignedToId !== adminProfile.userId) {
          try {
            await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
              userId: assignedToId!,
              type: "task_assigned",
              title: "New Task Assigned",
              message: `You have been assigned a new task: "${args.title}"`,
              entityType: "task",
              entityId: taskId,
            });
          } catch (error) {
            console.error("Failed to create notification:", error);
          }
        }
      } catch (error) {
        results.failed.push({
          processId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: adminProfile.userId!,
        action: "bulk_create_tasks_completed",
        entityType: "task",
        entityId: "bulk",
        details: {
          title: args.title,
          totalProcessed: results.totalProcessed,
          successful: results.successful.length,
          failed: results.failed.length,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return results;
  },
});

/**
 * Bulk reassign tasks to a new assignee (admin only)
 */
export const bulkReassignTasks = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    newAssigneeId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin access
    const adminProfile = await requireAdmin(ctx);

    if (args.taskIds.length === 0) {
      throw new Error("At least one task must be selected");
    }

    // Verify new assignee exists and is admin
    const newAssigneeProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.newAssigneeId))
      .first();

    if (!newAssigneeProfile) {
      throw new Error("New assignee not found");
    }

    if (newAssigneeProfile.role !== "admin") {
      throw new Error("Tasks can only be assigned to admin users");
    }

    const results = {
      successful: [] as Id<"tasks">[],
      failed: [] as { taskId: Id<"tasks">; reason: string }[],
      totalProcessed: args.taskIds.length,
    };

    // Reassign each task
    for (const taskId of args.taskIds) {
      try {
        const task = await ctx.db.get(taskId);
        if (!task) {
          results.failed.push({
            taskId,
            reason: "Task not found",
          });
          continue;
        }

        // Skip if already assigned to the new assignee
        if (task.assignedTo === args.newAssigneeId) {
          results.failed.push({
            taskId,
            reason: "Task is already assigned to this user",
          });
          continue;
        }

        const previousAssigneeId = task.assignedTo;

        // Update task
        await ctx.db.patch(taskId, {
          assignedTo: args.newAssigneeId,
          updatedAt: Date.now(),
        });

        results.successful.push(taskId);

        // Log activity (non-blocking)
        try {
          await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
            userId: adminProfile.userId!,
            action: "bulk_reassign_task",
            entityType: "task",
            entityId: taskId,
            details: {
              title: task.title,
              previousAssignee: previousAssigneeId,
              newAssignee: args.newAssigneeId,
              reason: args.reason,
            },
          });
        } catch (error) {
          console.error("Failed to log activity:", error);
        }

        // Send notification to new assignee (non-blocking)
        try {
          await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
            userId: args.newAssigneeId,
            type: "task_assigned",
            title: "Task Reassigned to You",
            message: `A task has been reassigned to you: "${task.title}"${
              args.reason ? ` - ${args.reason}` : ""
            }`,
            entityType: "task",
            entityId: taskId,
          });
        } catch (error) {
          console.error("Failed to create notification:", error);
        }
      } catch (error) {
        results.failed.push({
          taskId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: adminProfile.userId!,
        action: "bulk_reassign_tasks_completed",
        entityType: "task",
        entityId: "bulk",
        details: {
          newAssignee: args.newAssigneeId,
          totalProcessed: results.totalProcessed,
          successful: results.successful.length,
          failed: results.failed.length,
          reason: args.reason,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return results;
  },
});

/**
 * Bulk update task status (admin only)
 */
export const bulkUpdateTaskStatus = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    // Require admin access
    const adminProfile = await requireAdmin(ctx);

    if (args.taskIds.length === 0) {
      throw new Error("At least one task must be selected");
    }

    // Validate status
    const validStatuses = ["todo", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(args.newStatus)) {
      throw new Error(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    const results = {
      successful: [] as Id<"tasks">[],
      failed: [] as { taskId: Id<"tasks">; reason: string }[],
      totalProcessed: args.taskIds.length,
    };

    const now = Date.now();

    // Update each task
    for (const taskId of args.taskIds) {
      try {
        const task = await ctx.db.get(taskId);
        if (!task) {
          results.failed.push({
            taskId,
            reason: "Task not found",
          });
          continue;
        }

        // Skip if already in the target status
        if (task.status === args.newStatus) {
          results.failed.push({
            taskId,
            reason: `Task is already in status: ${args.newStatus}`,
          });
          continue;
        }

        const previousStatus = task.status;

        // Update task
        const updateData: any = {
          status: args.newStatus,
          updatedAt: now,
        };

        // Set completedAt and completedBy when marking as completed
        if (args.newStatus === "completed") {
          updateData.completedAt = now;
          updateData.completedBy = adminProfile.userId;
        }

        await ctx.db.patch(taskId, updateData);

        results.successful.push(taskId);

        // Log activity (non-blocking)
        try {
          await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
            userId: adminProfile.userId!,
            action: "bulk_update_task_status",
            entityType: "task",
            entityId: taskId,
            details: {
              title: task.title,
              previousStatus,
              newStatus: args.newStatus,
            },
          });
        } catch (error) {
          console.error("Failed to log activity:", error);
        }

        // Send notification to assignee about status change (non-blocking)
        if (task.assignedTo && task.assignedTo !== adminProfile.userId && args.newStatus === "completed") {
          try {
            await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
              userId: task.assignedTo,
              type: "task_completed",
              title: "Task Completed",
              message: `Task "${task.title}" has been marked as completed`,
              entityType: "task",
              entityId: taskId,
            });
          } catch (error) {
            console.error("Failed to create notification:", error);
          }
        }
      } catch (error) {
        results.failed.push({
          taskId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk operation summary (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: adminProfile.userId!,
        action: "bulk_update_task_status_completed",
        entityType: "task",
        entityId: "bulk",
        details: {
          newStatus: args.newStatus,
          totalProcessed: results.totalProcessed,
          successful: results.successful.length,
          failed: results.failed.length,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return results;
  },
});

/**
 * Helper function to calculate due date based on process type SLA
 * Used when auto-generating tasks
 */
export async function calculateDueDate(
  ctx: any,
  processTypeId: Id<"processTypes">,
  daysOffset: number = 0
): Promise<string> {
  const processType = await ctx.db.get(processTypeId);
  if (!processType) {
    throw new Error("Process type not found");
  }

  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + processType.estimatedDays + daysOffset);

  return dueDate.toISOString().split("T")[0];
}

/**
 * Auto-generate tasks when an individual process status changes
 * Called from individualProcesses.update mutation
 */
export async function autoGenerateTasksOnStatusChange(
  ctx: any,
  individualProcessId: Id<"individualProcesses">,
  newStatus: string,
  currentUserId: Id<"users">
): Promise<void> {
  const individualProcess = await ctx.db.get(individualProcessId);
  if (!individualProcess) {
    return;
  }

  if (!individualProcess.collectiveProcessId) {
    return;
  }

  const collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
  if (!collectiveProcess) {
    return;
  }

  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];

  // Define task templates based on status transitions
  const taskTemplates: Record<string, Array<{
    title: string;
    description: string;
    priority: string;
    daysOffset: number;
  }>> = {
    "in_analysis": [
      {
        title: "Review submitted documents",
        description: "Review all documents submitted for this individual process and verify completeness",
        priority: "high",
        daysOffset: 2,
      },
    ],
    "documents_pending": [
      {
        title: "Follow up on missing documents",
        description: "Contact the client to request missing documents",
        priority: "high",
        daysOffset: 3,
      },
    ],
    "submitted_to_pf": [
      {
        title: "Track Federal Police submission",
        description: "Monitor the status of the submission to Federal Police",
        priority: "medium",
        daysOffset: 7,
      },
    ],
    "awaiting_appointment": [
      {
        title: "Schedule appointment",
        description: "Schedule appointment for the applicant at the appropriate office",
        priority: "high",
        daysOffset: 5,
      },
    ],
    "awaiting_card_delivery": [
      {
        title: "Track card delivery",
        description: "Monitor the delivery status of the RNM card",
        priority: "medium",
        daysOffset: 15,
      },
    ],
  };

  const templates = taskTemplates[newStatus];
  if (!templates) {
    return; // No auto-tasks for this status
  }

  // Create tasks for each template
  for (const template of templates) {
    const dueDate = await calculateDueDate(ctx, collectiveProcess.processTypeId, template.daysOffset);

    await ctx.db.insert("tasks", {
      individualProcessId,
      collectiveProcessId: collectiveProcess._id,
      title: template.title,
      description: template.description,
      dueDate,
      priority: template.priority,
      status: "todo",
      assignedTo: currentUserId, // Assign to the user who made the status change
      createdBy: currentUserId,
      createdAt: now,
      updatedAt: now,
    });
  }
}
