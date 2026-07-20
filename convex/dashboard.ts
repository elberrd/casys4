import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  getClientCurrentCompanyIds,
  getCurrentUserProfile,
  getIndividualProcessCompanyIds,
  requireAdmin,
} from "./lib/auth";
import { createCachedGet } from "./lib/cachedGet";
import {
  filterClientChecklistDocuments,
  resolveClientDocumentVisibility,
} from "./lib/clientDocumentVisibility";

function getFullName(person: { givenNames: string; middleName?: string; surname?: string }): string {
  return [person.givenNames, person.middleName, person.surname].filter(Boolean).join(" ");
}

function setsOverlap<T>(left: Set<T>, right: Set<T>): boolean {
  for (const value of left) {
    if (right.has(value)) return true;
  }
  return false;
}

async function getClientCompanyIdsOrThrow(
  ctx: QueryCtx,
  userProfile: Doc<"userProfiles">
): Promise<Set<Id<"companies">>> {
  const currentCompanyIds = await getClientCurrentCompanyIds(ctx, userProfile);

  if (currentCompanyIds.size === 0) {
    throw new Error("Client user must have a current company assignment");
  }

  return currentCompanyIds;
}

async function processBelongsToCompanies(
  ctx: QueryCtx,
  process: Doc<"individualProcesses">,
  companyIds: Set<Id<"companies">>
): Promise<boolean> {
  const processCompanyIds = await getIndividualProcessCompanyIds(ctx, process);
  return setsOverlap(processCompanyIds, companyIds);
}

async function filterProcessesForUser(
  ctx: QueryCtx,
  userProfile: Doc<"userProfiles">,
  processes: Array<Doc<"individualProcesses">>
): Promise<Array<Doc<"individualProcesses">>> {
  // Client-request drafts are not yet live processes — keep them out of every
  // dashboard aggregation (counts, deadlines, document stats).
  processes = processes.filter((p) => p.requestStatus !== "draft");

  if (userProfile.role !== "client") {
    return processes;
  }

  const currentCompanyIds = await getClientCompanyIdsOrThrow(ctx, userProfile);
  const filtered = await Promise.all(
    processes.map(async (process) =>
      (await processBelongsToCompanies(ctx, process, currentCompanyIds)) ? process : null
    )
  );

  return filtered.filter((process): process is Doc<"individualProcesses"> => process !== null);
}

function isActionRequiredDocument(doc: Doc<"documentsDelivered">): boolean {
  return doc.status === "not_started" || doc.status === "rejected";
}

function isAwaitingReviewDocument(doc: Doc<"documentsDelivered">): boolean {
  return doc.status === "uploaded" || doc.status === "under_review";
}

/**
 * Query to get process statistics
 * Admin sees all, client sees only their company's data
 */
export const getProcessStats = query({
  args: {},
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Get all individual processes
    let processes = await ctx.db.query("individualProcesses").collect();

    processes = await filterProcessesForUser(ctx, userProfile, processes);

    // Count by case status
    const statusCounts: Record<string, { count: number; name: string; code: string }> = {};

    await Promise.all(
      processes.map(async (process) => {
        if (process.caseStatusId) {
          const caseStatus = await cachedGet(process.caseStatusId);
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
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Client uploads are stored as "uploaded"; include explicit "under_review"
    // records too so staff sees every document waiting for action.
    const [uploadedDocuments, underReviewDocuments] = await Promise.all([
      ctx.db
        .query("documentsDelivered")
        .withIndex("by_status", (q) => q.eq("status", "uploaded"))
        .order("desc")
        .take(20),
      ctx.db
        .query("documentsDelivered")
        .withIndex("by_status", (q) => q.eq("status", "under_review"))
        .order("desc")
        .take(20),
    ]);
    const documents = [...uploadedDocuments, ...underReviewDocuments]
      .filter((doc) => doc.isLatest)
      .sort((a, b) => b.uploadedAt - a.uploadedAt)
      .slice(0, 20);

    // Enrich with related data
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const [individualProcess, documentType, person] = await Promise.all([
          cachedGet(doc.individualProcessId),
          doc.documentTypeId ? cachedGet(doc.documentTypeId) : null,
          doc.personId ? cachedGet(doc.personId) : null,
        ]);

        let collectiveProcess = null;
        if (individualProcess && individualProcess.collectiveProcessId) {
          collectiveProcess = await cachedGet(individualProcess.collectiveProcessId);
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
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);
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
          task.assignedTo ? cachedGet(task.assignedTo) : null,
          task.collectiveProcessId ? cachedGet(task.collectiveProcessId) : null,
          task.individualProcessId ? cachedGet(task.individualProcessId) : null,
        ]);

        const assignedToProfile = assignedToUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", assignedToUser._id))
              .first()
          : null;

        let person = null;
        if (individualProcess) {
          person = await cachedGet(individualProcess.personId);
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
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

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
          const caseStatus = await cachedGet(process.caseStatusId);
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

    processes = await filterProcessesForUser(ctx, userProfile, processes);

    // Enrich with related data
    const enrichedProcesses = await Promise.all(
      processes.map(async (process) => {
        const [person, collectiveProcess, processType] = await Promise.all([
          cachedGet(process.personId),
          process.collectiveProcessId ? cachedGet(process.collectiveProcessId) : Promise.resolve(null),
          process.legalFrameworkId ? cachedGet(process.legalFrameworkId) : null,
        ]);

        const processTypeData = collectiveProcess && collectiveProcess.processTypeId
          ? await cachedGet(collectiveProcess.processTypeId)
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

    const allProcesses = await ctx.db.query("individualProcesses").collect();
    // Exclude client-request drafts.
    const processes = allProcesses.filter((p) => p.requestStatus !== "draft");

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
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Get recent process history entries
    const historyEntries = await ctx.db
      .query("processHistory")
      .withIndex("by_changedAt")
      .order("desc")
      .take(20);

    let filteredHistory = historyEntries;
    if (userProfile.role === "client") {
      const currentCompanyIds = await getClientCompanyIdsOrThrow(ctx, userProfile);
      const filtered = await Promise.all(
        historyEntries.map(async (entry) => {
          const individualProcess = await cachedGet(entry.individualProcessId);
          if (!individualProcess) return null;
          return (await processBelongsToCompanies(ctx, individualProcess, currentCompanyIds))
            ? entry
            : null;
        })
      );

      filteredHistory = filtered.filter((entry): entry is (typeof historyEntries)[number] => entry !== null);
    }

    // Enrich with related data
    const enrichedHistory = await Promise.all(
      filteredHistory.map(async (entry) => {
        const [changedByUser, individualProcess] = await Promise.all([
          cachedGet(entry.changedBy),
          cachedGet(entry.individualProcessId),
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
          person = await cachedGet(individualProcess.personId);
          if (individualProcess.collectiveProcessId) {
            collectiveProcess = await cachedGet(individualProcess.collectiveProcessId);
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
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    const flatIndividualProcesses = await filterProcessesForUser(
      ctx,
      userProfile,
      await ctx.db.query("individualProcesses").collect()
    );

    // Get documents for all individual processes
    const documentsPromises = flatIndividualProcesses.map(async (ip) => {
      const docs = await ctx.db
        .query("documentsDelivered")
        .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", ip._id))
        .collect();
      const visibility = await resolveClientDocumentVisibility(
        ctx,
        userProfile,
        ip,
      );
      const visibleDocuments = filterClientChecklistDocuments(
        docs.filter((doc) => doc.isLatest),
        visibility,
        false,
      ).documents;

      const person = await cachedGet(ip.personId);

      return {
        personId: ip.personId,
        personName: person ? getFullName(person) : "Unknown",
        documents: visibleDocuments,
      };
    });

    const documentsData = await Promise.all(documentsPromises);

    // Aggregate document status by person
    const statusByPerson = documentsData.map((data) => {
      const pending = data.documents.filter((d) => d.status === "not_started").length;
      const approved = data.documents.filter((d) => d.status === "approved").length;
      const rejected = data.documents.filter((d) => d.status === "rejected").length;
      const underReview = data.documents.filter(isAwaitingReviewDocument).length;

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

/**
 * Maximum number of actionable documents returned to the client dashboard.
 * The widget displays them inside a scrollable list with tabs and search;
 * clients with more pending docs can drill down via /individual-processes.
 */
const CLIENT_DASHBOARD_DOC_LIMIT = 100;

type ActionableDocSummary = {
  _id: Id<"documentsDelivered">;
  individualProcessId: Id<"individualProcesses">;
  personName: string;
  referenceNumber?: string;
  processTypeName?: string;
  documentName: string;
  status: Doc<"documentsDelivered">["status"];
  isExigencia: boolean;
  caseStatusName?: string;
  clientDeadlineDate?: string;
  priority: number;
};

/**
 * Query to get actionable missing documents grouped by process for the client dashboard.
 * Clients are scoped by their current company assignment, not the legacy profile company.
 *
 * Returns both an aggregated per-process summary and a flat, priority-sorted list of
 * individual actionable documents so the dashboard can render a doc-level action center
 * that stays manageable even when clients have many processes or documents.
 */
export const getClientMissingDocumentsSummary = query({
  args: {},
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);
    const processes = await filterProcessesForUser(
      ctx,
      userProfile,
      await ctx.db.query("individualProcesses").collect()
    );

    const actionableDocsFlat: ActionableDocSummary[] = [];

    const processSummaries = await Promise.all(
      processes.map(async (process) => {
        const documents = await ctx.db
          .query("documentsDelivered")
          .withIndex("by_individualProcess", (q) =>
            q.eq("individualProcessId", process._id)
          )
          .collect();
        const visibility = await resolveClientDocumentVisibility(
          ctx,
          userProfile,
          process,
        );
        const visibleDocuments = filterClientChecklistDocuments(
          documents.filter((doc) => doc.isLatest),
          visibility,
          false,
        ).documents;

        const actionableDocuments = visibleDocuments.filter(isActionRequiredDocument);
        if (actionableDocuments.length === 0 && visibleDocuments.length === 0) {
          return null;
        }

        const [person, collectiveProcess, processType, companyApplicant] = await Promise.all([
          cachedGet(process.personId),
          process.collectiveProcessId ? cachedGet(process.collectiveProcessId) : null,
          process.processTypeId ? cachedGet(process.processTypeId) : null,
          process.companyApplicantId ? cachedGet(process.companyApplicantId) : null,
        ]);

        const collectiveCompany = collectiveProcess?.companyId
          ? await cachedGet(collectiveProcess.companyId)
          : null;
        const company = companyApplicant ?? collectiveCompany;
        const personName = person ? getFullName(person) : "Unknown";
        const referenceNumber = collectiveProcess?.referenceNumber;
        const processTypeName = processType?.name;

        const enrichedActionableDocuments = await Promise.all(
          actionableDocuments.map(async (doc) => {
            const documentType = doc.documentTypeId
              ? await cachedGet(doc.documentTypeId)
              : null;

            let linkedStatus:
              | {
                  caseStatusName: string;
                  caseStatusCode: string;
                  clientDeadlineDate?: string;
                  date?: string;
                }
              | undefined;

            if (doc.individualProcessStatusId) {
              const statusEntry = await cachedGet(doc.individualProcessStatusId);
              const caseStatus = statusEntry
                ? await cachedGet(statusEntry.caseStatusId)
                : null;
              if (statusEntry && caseStatus) {
                linkedStatus = {
                  caseStatusName: caseStatus.name,
                  caseStatusCode: caseStatus.code,
                  clientDeadlineDate: statusEntry.clientDeadlineDate,
                  date: statusEntry.date,
                };
              }
            }

            const isExigencia = linkedStatus?.caseStatusCode === "exigencia";
            const isRejected = doc.status === "rejected";
            // Priority: lower is more urgent.
            // 0=exigencia, 1=rejected, 2=pending
            const priority = isExigencia ? 0 : isRejected ? 1 : 2;

            const docName =
              documentType?.name ||
              doc.documentName ||
              doc.fileName ||
              "Documento";

            actionableDocsFlat.push({
              _id: doc._id,
              individualProcessId: process._id,
              personName,
              referenceNumber,
              processTypeName,
              documentName: docName,
              status: doc.status,
              isExigencia,
              caseStatusName: linkedStatus?.caseStatusName,
              clientDeadlineDate: linkedStatus?.clientDeadlineDate,
              priority,
            });

            return {
              _id: doc._id,
              documentName: docName,
              status: doc.status,
              isRequired: doc.isRequired === true,
              linkedStatus,
            };
          })
        );

        const exigenciaDocuments = enrichedActionableDocuments.filter(
          (doc) => doc.linkedStatus?.caseStatusCode === "exigencia"
        );
        const clientDeadlineDate = exigenciaDocuments
          .map((doc) => doc.linkedStatus?.clientDeadlineDate)
          .filter((date): date is string => Boolean(date))
          .sort()[0];

        return {
          individualProcessId: process._id,
          personName,
          referenceNumber,
          processTypeName,
          companyName: company?.name,
          pendingCount: visibleDocuments.filter((doc) => doc.status === "not_started").length,
          rejectedCount: visibleDocuments.filter((doc) => doc.status === "rejected").length,
          exigenciaCount: exigenciaDocuments.length,
          awaitingReviewCount: visibleDocuments.filter(isAwaitingReviewDocument).length,
          approvedCount: visibleDocuments.filter((doc) => doc.status === "approved").length,
          totalCount: visibleDocuments.length,
          clientDeadlineDate,
          nextDocument: enrichedActionableDocuments[0] ?? null,
          documents: enrichedActionableDocuments.slice(0, 5),
        };
      })
    );

    const processesWithDocuments = processSummaries.filter(
      (summary): summary is NonNullable<typeof summary> => summary !== null
    );
    const processesNeedingAction = processesWithDocuments
      .filter((process) => process.pendingCount + process.rejectedCount > 0)
      .sort((a, b) => {
        if (a.exigenciaCount !== b.exigenciaCount) {
          return b.exigenciaCount - a.exigenciaCount;
        }
        if (a.clientDeadlineDate && b.clientDeadlineDate) {
          return a.clientDeadlineDate.localeCompare(b.clientDeadlineDate);
        }
        if (a.clientDeadlineDate) return -1;
        if (b.clientDeadlineDate) return 1;
        return (b.pendingCount + b.rejectedCount) - (a.pendingCount + a.rejectedCount);
      });

    const totals = processesWithDocuments.reduce(
      (acc, process) => ({
        pending: acc.pending + process.pendingCount,
        rejected: acc.rejected + process.rejectedCount,
        exigencia: acc.exigencia + process.exigenciaCount,
        awaitingReview: acc.awaitingReview + process.awaitingReviewCount,
        approved: acc.approved + process.approvedCount,
        total: acc.total + process.totalCount,
      }),
      {
        pending: 0,
        rejected: 0,
        exigencia: 0,
        awaitingReview: 0,
        approved: 0,
        total: 0,
      }
    );

    actionableDocsFlat.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.clientDeadlineDate && b.clientDeadlineDate) {
        return a.clientDeadlineDate.localeCompare(b.clientDeadlineDate);
      }
      if (a.clientDeadlineDate) return -1;
      if (b.clientDeadlineDate) return 1;
      return a.personName.localeCompare(b.personName);
    });

    const actionableTotal = actionableDocsFlat.length;
    const limitedDocuments = actionableDocsFlat.slice(0, CLIENT_DASHBOARD_DOC_LIMIT);

    return {
      totals: {
        ...totals,
        actionRequired: totals.pending + totals.rejected,
        processesNeedingAction: processesNeedingAction.length,
      },
      processes: processesNeedingAction,
      documents: limitedDocuments,
      documentsTotal: actionableTotal,
      documentsLimit: CLIENT_DASHBOARD_DOC_LIMIT,
    };
  },
});
