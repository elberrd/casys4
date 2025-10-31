import { query } from "./_generated/server";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";

/**
 * Query to get process statistics
 * Admin sees all, client sees only their company's data
 */
export const getProcessStats = query({
  args: {},
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get all individual processes
    let processes = await ctx.db.query("individualProcesses").collect();

    // Filter by company for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Filter by company through mainProcess
      const filteredProcesses = await Promise.all(
        processes.map(async (process) => {
          const mainProcess = await ctx.db.get(process.mainProcessId);
          if (mainProcess && mainProcess.companyId === userProfile.companyId) {
            return process;
          }
          return null;
        })
      );

      processes = filteredProcesses.filter((p) => p !== null) as typeof processes;
    }

    // Count by status
    const statusCounts = processes.reduce((acc: Record<string, number>, process) => {
      if (process.status) {
        acc[process.status] = (acc[process.status] || 0) + 1;
      }
      return acc;
    }, {});

    const total = processes.length;

    // Calculate percentages
    const statusPercentages: Record<string, number> = {};
    Object.keys(statusCounts).forEach((status) => {
      statusPercentages[status] = total > 0 ? (statusCounts[status] / total) * 100 : 0;
    });

    return {
      total,
      statusCounts,
      statusPercentages,
    };
  },
});

/**
 * Query to get document review queue
 * Admin only - shows documents awaiting review
 */
export const getDocumentReviewQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    // Get documents with status "under_review"
    const documents = await ctx.db
      .query("documentsDelivered")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .order("desc")
      .take(20);

    // Enrich with related data
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const [individualProcess, documentType, person] = await Promise.all([
          ctx.db.get(doc.individualProcessId),
          ctx.db.get(doc.documentTypeId),
          doc.personId ? ctx.db.get(doc.personId) : null,
        ]);

        let mainProcess = null;
        if (individualProcess) {
          mainProcess = await ctx.db.get(individualProcess.mainProcessId);
        }

        return {
          ...doc,
          documentType: documentType ? { _id: documentType._id, name: documentType.name } : null,
          person: person ? { _id: person._id, fullName: person.fullName } : null,
          mainProcess: mainProcess
            ? {
                _id: mainProcess._id,
                referenceNumber: mainProcess.referenceNumber,
              }
            : null,
        };
      })
    );

    return enrichedDocuments;
  },
});

/**
 * Query to get overdue tasks
 * Users see their own tasks, admins see all
 */
export const getOverdueTasks = query({
  args: {},
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const today = new Date().toISOString().split("T")[0];

    let tasks = await ctx.db.query("tasks").collect();

    // Filter for overdue and not completed/cancelled
    tasks = tasks.filter(
      (task) =>
        task.status !== "completed" &&
        task.status !== "cancelled" &&
        task.dueDate && task.dueDate < today
    );

    // Filter by user for non-admin users
    if (userProfile.role !== "admin") {
      tasks = tasks.filter((task) => task.assignedTo === userProfile.userId);
    }

    // Enrich with related data
    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const [assignedToUser, mainProcess, individualProcess] = await Promise.all([
          task.assignedTo ? ctx.db.get(task.assignedTo) : null,
          task.mainProcessId ? ctx.db.get(task.mainProcessId) : null,
          task.individualProcessId ? ctx.db.get(task.individualProcessId) : null,
        ]);

        const assignedToProfile = assignedToUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", assignedToUser._id))
              .first()
          : null;

        let person = null;
        if (individualProcess) {
          person = await ctx.db.get(individualProcess.personId);
        }

        return {
          ...task,
          assignedToUser: assignedToProfile
            ? {
                _id: assignedToProfile._id,
                fullName: assignedToProfile.fullName,
              }
            : null,
          mainProcess: mainProcess
            ? {
                _id: mainProcess._id,
                referenceNumber: mainProcess.referenceNumber,
              }
            : null,
          person: person
            ? {
                _id: person._id,
                fullName: person.fullName,
              }
            : null,
        };
      })
    );

    return enrichedTasks;
  },
});

/**
 * Query to get upcoming deadlines
 * Admin sees all, client sees their company's deadlines
 */
export const getUpcomingDeadlines = query({
  args: {},
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const todayStr = today.toISOString().split("T")[0];
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

    // Get all individual processes with deadlines
    let processes = await ctx.db.query("individualProcesses").collect();

    // Filter by deadline range
    processes = processes.filter(
      (p) =>
        p.deadlineDate &&
        p.deadlineDate >= todayStr &&
        p.deadlineDate <= thirtyDaysStr &&
        p.status && p.status !== "completed"
    );

    // Filter by company for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      const filteredProcesses = await Promise.all(
        processes.map(async (process) => {
          const mainProcess = await ctx.db.get(process.mainProcessId);
          if (mainProcess && mainProcess.companyId === userProfile.companyId) {
            return process;
          }
          return null;
        })
      );

      processes = filteredProcesses.filter((p) => p !== null) as typeof processes;
    }

    // Enrich with related data
    const enrichedProcesses = await Promise.all(
      processes.map(async (process) => {
        const [person, mainProcess, processType] = await Promise.all([
          ctx.db.get(process.personId),
          ctx.db.get(process.mainProcessId),
          process.legalFrameworkId ? ctx.db.get(process.legalFrameworkId) : null,
        ]);

        const processTypeData = mainProcess && mainProcess.processTypeId
          ? await ctx.db.get(mainProcess.processTypeId)
          : null;

        // Calculate days remaining
        const deadlineDate = new Date(process.deadlineDate!);
        const daysRemaining = Math.ceil(
          (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...process,
          person: person ? { _id: person._id, fullName: person.fullName } : null,
          mainProcess: mainProcess
            ? {
                _id: mainProcess._id,
                referenceNumber: mainProcess.referenceNumber,
              }
            : null,
          processType: processTypeData
            ? {
                _id: processTypeData._id,
                name: processTypeData.name,
              }
            : null,
          daysRemaining,
        };
      })
    );

    return enrichedProcesses;
  },
});

/**
 * Query to get process completion rate
 * Admin only
 */
export const getProcessCompletionRate = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const processes = await ctx.db.query("individualProcesses").collect();

    // Filter processes created in last 30 days
    const recentProcesses = processes.filter(
      (p) => p.createdAt >= thirtyDaysAgo.getTime()
    );

    const completedProcesses = recentProcesses.filter(
      (p) => p.completedAt !== undefined
    );

    const completionRate =
      recentProcesses.length > 0
        ? (completedProcesses.length / recentProcesses.length) * 100
        : 0;

    // Calculate average days to complete
    let totalDays = 0;
    completedProcesses.forEach((p) => {
      if (p.completedAt) {
        const days = (p.completedAt - p.createdAt) / (1000 * 60 * 60 * 24);
        totalDays += days;
      }
    });

    const averageDaysToComplete =
      completedProcesses.length > 0
        ? totalDays / completedProcesses.length
        : 0;

    return {
      totalProcesses: recentProcesses.length,
      completedProcesses: completedProcesses.length,
      completionRate,
      averageDaysToComplete: Math.round(averageDaysToComplete),
    };
  },
});

/**
 * Query to get recent activity feed
 * Users see activities related to their data
 */
export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get recent process history entries
    const historyEntries = await ctx.db
      .query("processHistory")
      .withIndex("by_changedAt")
      .order("desc")
      .take(20);

    // Filter by company for client users
    let filteredHistory = historyEntries;
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      const filtered = await Promise.all(
        historyEntries.map(async (entry) => {
          const individualProcess = await ctx.db.get(entry.individualProcessId);
          if (individualProcess) {
            const mainProcess = await ctx.db.get(individualProcess.mainProcessId);
            if (mainProcess && mainProcess.companyId === userProfile.companyId) {
              return entry;
            }
          }
          return null;
        })
      );

      filteredHistory = filtered.filter((e) => e !== null) as typeof historyEntries;
    }

    // Enrich with related data
    const enrichedHistory = await Promise.all(
      filteredHistory.map(async (entry) => {
        const [changedByUser, individualProcess] = await Promise.all([
          ctx.db.get(entry.changedBy),
          ctx.db.get(entry.individualProcessId),
        ]);

        const changedByProfile = changedByUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", changedByUser._id))
              .first()
          : null;

        let person = null;
        let mainProcess = null;
        if (individualProcess) {
          person = await ctx.db.get(individualProcess.personId);
          mainProcess = await ctx.db.get(individualProcess.mainProcessId);
        }

        return {
          ...entry,
          changedByUser: changedByProfile
            ? {
                _id: changedByProfile._id,
                fullName: changedByProfile.fullName,
              }
            : null,
          person: person ? { _id: person._id, fullName: person.fullName } : null,
          mainProcess: mainProcess
            ? {
                _id: mainProcess._id,
                referenceNumber: mainProcess.referenceNumber,
              }
            : null,
        };
      })
    );

    return enrichedHistory;
  },
});

/**
 * Query to get company document status
 * For client dashboard - shows document completion for company's people
 */
export const getCompanyDocumentStatus = query({
  args: {},
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);

    if (userProfile.role === "client" && !userProfile.companyId) {
      throw new Error("Client user must have a company assignment");
    }

    const companyId = userProfile.role === "admin" ? null : userProfile.companyId;

    // Get all main processes for the company
    let mainProcesses = await ctx.db.query("mainProcesses").collect();

    if (companyId) {
      mainProcesses = mainProcesses.filter((mp) => mp.companyId === companyId);
    }

    // Get all individual processes for these main processes
    const individualProcesses = await Promise.all(
      mainProcesses.map(async (mp) => {
        return await ctx.db
          .query("individualProcesses")
          .withIndex("by_mainProcess", (q) => q.eq("mainProcessId", mp._id))
          .collect();
      })
    );

    const flatIndividualProcesses = individualProcesses.flat();

    // Get documents for all individual processes
    const documentsPromises = flatIndividualProcesses.map(async (ip) => {
      const docs = await ctx.db
        .query("documentsDelivered")
        .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", ip._id))
        .collect();

      const person = await ctx.db.get(ip.personId);

      return {
        personId: ip.personId,
        personName: person?.fullName || "Unknown",
        documents: docs,
      };
    });

    const documentsData = await Promise.all(documentsPromises);

    // Aggregate document status by person
    const statusByPerson = documentsData.map((data) => {
      const pending = data.documents.filter((d) => d.status === "pending_upload").length;
      const approved = data.documents.filter((d) => d.status === "approved").length;
      const rejected = data.documents.filter((d) => d.status === "rejected").length;
      const underReview = data.documents.filter((d) => d.status === "under_review")
        .length;

      return {
        personId: data.personId,
        personName: data.personName,
        pending,
        approved,
        rejected,
        underReview,
        total: data.documents.length,
      };
    });

    return statusByPerson;
  },
});
