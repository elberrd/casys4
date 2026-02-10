import { query } from "./_generated/server";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";

function getFullName(person: { givenNames: string; middleName?: string; surname?: string }): string {
  return [person.givenNames, person.middleName, person.surname].filter(Boolean).join(" ");
}

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

      // Filter by company through collectiveProcess
      const filteredProcesses = await Promise.all(
        processes.map(async (process) => {
          if (!process.collectiveProcessId) return null;
          const collectiveProcess = await ctx.db.get(process.collectiveProcessId);
          if (collectiveProcess && collectiveProcess.companyId === userProfile.companyId) {
            return process;
          }
          return null;
        })
      );

      processes = filteredProcesses.filter((p) => p !== null) as typeof processes;
    }

    // Count by case status
    const statusCounts: Record<string, { count: number; name: string; code: string }> = {};

    await Promise.all(
      processes.map(async (process) => {
        if (process.caseStatusId) {
          const caseStatus = await ctx.db.get(process.caseStatusId);
          if (caseStatus) {
            const key = caseStatus._id;
            if (!statusCounts[key]) {
              statusCounts[key] = {
                count: 0,
                name: caseStatus.name,
                code: caseStatus.code,
              };
            }
            statusCounts[key].count++;
          }
        }
      })
    );

    const total = processes.length;

    // Calculate percentages
    const statusPercentages: Record<string, number> = {};
    Object.keys(statusCounts).forEach((statusId) => {
      statusPercentages[statusId] = total > 0 ? (statusCounts[statusId].count / total) * 100 : 0;
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
          doc.documentTypeId ? ctx.db.get(doc.documentTypeId) : null,
          doc.personId ? ctx.db.get(doc.personId) : null,
        ]);

        let collectiveProcess = null;
        if (individualProcess && individualProcess.collectiveProcessId) {
          collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
        }

        return {
          ...doc,
          documentType: documentType ? { _id: documentType._id, name: documentType.name } : null,
          person: person ? { _id: person._id, fullName: getFullName(person) } : null,
          collectiveProcess: collectiveProcess
            ? {
                _id: collectiveProcess._id,
                referenceNumber: collectiveProcess.referenceNumber,
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
        const [assignedToUser, collectiveProcess, individualProcess] = await Promise.all([
          task.assignedTo ? ctx.db.get(task.assignedTo) : null,
          task.collectiveProcessId ? ctx.db.get(task.collectiveProcessId) : null,
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
          collectiveProcess: collectiveProcess
            ? {
                _id: collectiveProcess._id,
                referenceNumber: collectiveProcess.referenceNumber,
              }
            : null,
          person: person
            ? {
                _id: person._id,
                fullName: getFullName(person),
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

    // Filter by deadline range and get case statuses
    const processesWithDeadlines = processes.filter(
      (p) =>
        p.deadlineDate &&
        p.deadlineDate >= todayStr &&
        p.deadlineDate <= thirtyDaysStr &&
        p.caseStatusId // Has a case status assigned
    );

    // Filter out completed processes
    const filteredByStatus = await Promise.all(
      processesWithDeadlines.map(async (process) => {
        if (process.caseStatusId) {
          const caseStatus = await ctx.db.get(process.caseStatusId);
          // Exclude if status code indicates completion (concluido, cancelado, etc.)
          if (caseStatus && (
            caseStatus.code === "concluido" ||
            caseStatus.code === "cancelado" ||
            caseStatus.code === "indeferido"
          )) {
            return null;
          }
        }
        return process;
      })
    );

    processes = filteredByStatus.filter((p) => p !== null) as typeof processes;

    // Filter by company for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      const filteredProcesses = await Promise.all(
        processes.map(async (process) => {
          if (!process.collectiveProcessId) return null;
          const collectiveProcess = await ctx.db.get(process.collectiveProcessId);
          if (collectiveProcess && collectiveProcess.companyId === userProfile.companyId) {
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
        const [person, collectiveProcess, processType] = await Promise.all([
          ctx.db.get(process.personId),
          process.collectiveProcessId ? ctx.db.get(process.collectiveProcessId) : Promise.resolve(null),
          process.legalFrameworkId ? ctx.db.get(process.legalFrameworkId) : null,
        ]);

        const processTypeData = collectiveProcess && collectiveProcess.processTypeId
          ? await ctx.db.get(collectiveProcess.processTypeId)
          : null;

        // Calculate days remaining
        const deadlineDate = new Date(process.deadlineDate!);
        const daysRemaining = Math.ceil(
          (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...process,
          person: person ? { _id: person._id, fullName: getFullName(person) } : null,
          collectiveProcess: collectiveProcess
            ? {
                _id: collectiveProcess._id,
                referenceNumber: collectiveProcess.referenceNumber,
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
          if (individualProcess && individualProcess.collectiveProcessId) {
            const collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
            if (collectiveProcess && collectiveProcess.companyId === userProfile.companyId) {
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
        let collectiveProcess = null;
        if (individualProcess) {
          person = await ctx.db.get(individualProcess.personId);
          if (individualProcess.collectiveProcessId) {
            collectiveProcess = await ctx.db.get(individualProcess.collectiveProcessId);
          }
        }

        return {
          ...entry,
          changedByUser: changedByProfile
            ? {
                _id: changedByProfile._id,
                fullName: changedByProfile.fullName,
              }
            : null,
          person: person ? { _id: person._id, fullName: getFullName(person) } : null,
          collectiveProcess: collectiveProcess
            ? {
                _id: collectiveProcess._id,
                referenceNumber: collectiveProcess.referenceNumber,
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
    let collectiveProcesses = await ctx.db.query("collectiveProcesses").collect();

    if (companyId) {
      collectiveProcesses = collectiveProcesses.filter((mp) => mp.companyId === companyId);
    }

    // Get all individual processes for these main processes
    const individualProcesses = await Promise.all(
      collectiveProcesses.map(async (mp) => {
        return await ctx.db
          .query("individualProcesses")
          .withIndex("by_collectiveProcess", (q) => q.eq("collectiveProcessId", mp._id))
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
        personName: person ? getFullName(person) : "Unknown",
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
