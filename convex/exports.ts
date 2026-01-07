/**
 * Data Export Queries
 *
 * Queries for exporting data to CSV/Excel format
 * Includes role-based filtering for data security
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";

/**
 * Export collective processes with related data
 */
export const exportCollectiveProcesses = query({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get all collective processes
    let processes = await ctx.db.query("collectiveProcesses").collect();

    // Apply role-based filtering
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }
      // Filter to only their company's processes
      processes = processes.filter((p) => p.companyId === userProfile.companyId);
    } else if (args.companyId) {
      // Admin can filter by specific company
      processes = processes.filter((p) => p.companyId === args.companyId);
    }

    // Apply date range filter
    if (args.dateFrom) {
      processes = processes.filter((p) => p.requestDate && p.requestDate >= args.dateFrom!);
    }
    if (args.dateTo) {
      processes = processes.filter((p) => p.requestDate && p.requestDate <= args.dateTo!);
    }

    // Apply status filter
    if (args.statusFilter) {
      processes = processes.filter((p) => p.status === args.statusFilter);
    }

    // Enrich with related data
    const enrichedProcesses = await Promise.all(
      processes.map(async (process) => {
        const [company, contactPerson, processType, workplaceCity, consulate] =
          await Promise.all([
            process.companyId ? ctx.db.get(process.companyId) : null,
            process.contactPersonId ? ctx.db.get(process.contactPersonId) : null,
            process.processTypeId ? ctx.db.get(process.processTypeId) : null,
            process.workplaceCityId ? ctx.db.get(process.workplaceCityId) : null,
            process.consulateId ? ctx.db.get(process.consulateId) : null,
          ]);

        // Get workplace state
        const workplaceState = workplaceCity?.stateId
          ? await ctx.db.get(workplaceCity.stateId)
          : null;

        // Get consulate city
        const consulateCity = consulate?.cityId
          ? await ctx.db.get(consulate.cityId)
          : null;

        // Count individual processes
        const individualProcesses = await ctx.db
          .query("individualProcesses")
          .withIndex("by_collectiveProcess", (q) => q.eq("collectiveProcessId", process._id))
          .collect();

        return {
          id: process._id,
          referenceNumber: process.referenceNumber,
          companyName: company?.name || "",
          companyTaxId: company?.taxId || "",
          contactPersonName: contactPerson?.fullName || "",
          contactPersonEmail: contactPerson?.email || "",
          processType: processType?.name || "",
          workplaceCity: workplaceCity?.name || "",
          workplaceState: workplaceState?.name || "",
          consulateName: consulateCity?.name || "",
          isUrgent: process.isUrgent ? "Yes" : "No",
          status: process.status,
          requestDate: process.requestDate,
          completedAt: process.completedAt || "",
          individualProcessCount: individualProcesses.length,
          notes: process.notes || "",
          createdAt: process.createdAt,
          updatedAt: process.updatedAt,
        };
      })
    );

    return enrichedProcesses;
  },
});

/**
 * Export individual processes with person, status, dates
 */
export const exportIndividualProcesses = query({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    collectiveProcessId: v.optional(v.id("collectiveProcesses")),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get all individual processes
    let processes = await ctx.db.query("individualProcesses").collect();

    // Apply role-based filtering via collective process company
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
    } else if (args.companyId) {
      // Admin can filter by specific company
      const filteredProcesses = await Promise.all(
        processes.map(async (process) => {
          if (!process.collectiveProcessId) return null;
          const collectiveProcess = await ctx.db.get(process.collectiveProcessId);
          if (collectiveProcess && collectiveProcess.companyId === args.companyId) {
            return process;
          }
          return null;
        })
      );
      processes = filteredProcesses.filter((p) => p !== null) as typeof processes;
    }

    // Filter by collective process if specified
    if (args.collectiveProcessId) {
      processes = processes.filter(
        (p) => p.collectiveProcessId === args.collectiveProcessId
      );
    }

    // Filter inactive if not included
    if (!args.includeInactive) {
      processes = processes.filter((p) => p.isActive);
    }

    // Apply status filter
    if (args.statusFilter) {
      processes = processes.filter((p) => p.status === args.statusFilter);
    }

    // Enrich with related data
    const enrichedProcesses = await Promise.all(
      processes.map(async (process) => {
        const [person, collectiveProcess, legalFramework, cbo] = await Promise.all([
          ctx.db.get(process.personId),
          process.collectiveProcessId ? ctx.db.get(process.collectiveProcessId) : Promise.resolve(null),
          process.legalFrameworkId ? ctx.db.get(process.legalFrameworkId) : null,
          process.cboId ? ctx.db.get(process.cboId) : null,
        ]);

        // Get person nationality and city
        const [nationality, currentCity, birthCity] = person
          ? await Promise.all([
              person.nationalityId ? ctx.db.get(person.nationalityId) : null,
              person.currentCityId ? ctx.db.get(person.currentCityId) : null,
              person.birthCityId ? ctx.db.get(person.birthCityId) : null,
            ])
          : [null, null, null];

        // Get company
        const company = collectiveProcess && collectiveProcess.companyId
          ? await ctx.db.get(collectiveProcess.companyId)
          : null;

        return {
          id: process._id,
          collectiveProcessReference: collectiveProcess?.referenceNumber || "",
          companyName: company?.name || "",
          personFullName: person?.fullName || "",
          personEmail: person?.email || "",
          personCPF: person?.cpf || "",
          personBirthDate: person?.birthDate || "",
          personNationality: nationality?.name || "",
          personCurrentCity: currentCity?.name || "",
          personBirthCity: birthCity?.name || "",
          status: process.status,
          legalFramework: legalFramework?.name || "",
          cboCode: cbo?.code || "",
          cboTitle: cbo?.title || "",
          mreOfficeNumber: process.mreOfficeNumber || "",
          douNumber: process.douNumber || "",
          douSection: process.douSection || "",
          douPage: process.douPage || "",
          douDate: process.douDate || "",
          protocolNumber: process.protocolNumber || "",
          rnmNumber: process.rnmNumber || "",
          rnmProtocol: process.rnmProtocol || "",
          rnmDeadline: process.rnmDeadline || "",
          appointmentDateTime: process.appointmentDateTime || "",
          deadlineDate: process.deadlineDate || "",
          isActive: process.isActive ? "Yes" : "No",
          completedAt: process.completedAt || "",
          createdAt: process.createdAt,
          updatedAt: process.updatedAt,
        };
      })
    );

    return enrichedProcesses;
  },
});

/**
 * Export people database
 */
export const exportPeople = query({
  args: {
    companyId: v.optional(v.id("companies")),
    nationalityId: v.optional(v.id("countries")),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get all people
    let people = await ctx.db.query("people").collect();

    // Apply role-based access control via peopleCompanies relationship
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Get all peopleCompanies relationships for client's company
      const clientCompanyId = userProfile.companyId;
      const companyPeople = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_company", (q) => q.eq("companyId", clientCompanyId))
        .collect();

      const allowedPersonIds = new Set(companyPeople.map((pc) => pc.personId));

      // Filter to only people associated with client's company
      people = people.filter((person) => allowedPersonIds.has(person._id));
    } else if (args.companyId) {
      // Admin can filter by specific company
      const companyId = args.companyId; // Type narrowing
      const companyPeople = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect();

      const allowedPersonIds = new Set(companyPeople.map((pc) => pc.personId));
      people = people.filter((person) => allowedPersonIds.has(person._id));
    }

    // Apply nationality filter
    if (args.nationalityId) {
      people = people.filter((p) => p.nationalityId === args.nationalityId);
    }

    // Enrich with related data
    const enrichedPeople = await Promise.all(
      people.map(async (person) => {
        const [birthCity, currentCity, nationality] = await Promise.all([
          person.birthCityId ? ctx.db.get(person.birthCityId) : null,
          person.currentCityId ? ctx.db.get(person.currentCityId) : null,
          person.nationalityId ? ctx.db.get(person.nationalityId) : null,
        ]);

        // Get states
        const [birthState, currentState] = await Promise.all([
          birthCity?.stateId ? ctx.db.get(birthCity.stateId) : null,
          currentCity?.stateId ? ctx.db.get(currentCity.stateId) : null,
        ]);

        return {
          id: person._id,
          fullName: person.fullName,
          email: person.email,
          cpf: person.cpf || "",
          birthDate: person.birthDate,
          birthCity: birthCity?.name || "",
          birthState: birthState?.name || "",
          nationality: nationality?.name || "",
          maritalStatus: person.maritalStatus,
          profession: person.profession,
          motherName: person.motherName,
          fatherName: person.fatherName,
          phoneNumber: person.phoneNumber,
          address: person.address,
          currentCity: currentCity?.name || "",
          currentState: currentState?.name || "",
          notes: person.notes || "",
          createdAt: person.createdAt,
          updatedAt: person.updatedAt,
        };
      })
    );

    return enrichedPeople;
  },
});

/**
 * Export document tracking data
 */
export const exportDocuments = query({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    documentTypeId: v.optional(v.id("documentTypes")),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get all documents
    let documents = await ctx.db.query("documentsDelivered").collect();

    // Filter to latest versions only
    documents = documents.filter((doc) => doc.isLatest);

    // Apply role-based filtering via company
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }
      // Filter to their company's documents
      documents = documents.filter((d) => d.companyId === userProfile.companyId);
    } else if (args.companyId) {
      // Admin can filter by specific company
      documents = documents.filter((d) => d.companyId === args.companyId);
    }

    // Apply status filter
    if (args.statusFilter) {
      documents = documents.filter((d) => d.status === args.statusFilter);
    }

    // Apply document type filter
    if (args.documentTypeId) {
      documents = documents.filter((d) => d.documentTypeId === args.documentTypeId);
    }

    // Apply date range filter (by upload date)
    if (args.dateFrom) {
      const fromTimestamp = new Date(args.dateFrom).getTime();
      documents = documents.filter((d) => d.uploadedAt >= fromTimestamp);
    }
    if (args.dateTo) {
      const toTimestamp = new Date(args.dateTo).getTime();
      documents = documents.filter((d) => d.uploadedAt <= toTimestamp);
    }

    // Enrich with related data
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const [individualProcess, documentType, person, company, uploadedByUser, reviewedByUser] =
          await Promise.all([
            ctx.db.get(doc.individualProcessId),
            ctx.db.get(doc.documentTypeId),
            doc.personId ? ctx.db.get(doc.personId) : null,
            doc.companyId ? ctx.db.get(doc.companyId) : null,
            ctx.db.get(doc.uploadedBy),
            doc.reviewedBy ? ctx.db.get(doc.reviewedBy) : null,
          ]);

        // Get collective process
        const collectiveProcess = individualProcess && individualProcess.collectiveProcessId
          ? await ctx.db.get(individualProcess.collectiveProcessId)
          : null;

        // Get uploader and reviewer profiles
        const uploaderId = doc.uploadedBy; // Type narrowing
        const reviewerId = doc.reviewedBy; // Type narrowing
        const [uploaderProfile, reviewerProfile] = await Promise.all([
          uploaderId
            ? ctx.db
                .query("userProfiles")
                .withIndex("by_userId", (q) => q.eq("userId", uploaderId))
                .first()
            : null,
          reviewerId
            ? ctx.db
                .query("userProfiles")
                .withIndex("by_userId", (q) => q.eq("userId", reviewerId))
                .first()
            : null,
        ]);

        return {
          id: doc._id,
          collectiveProcessReference: collectiveProcess?.referenceNumber || "",
          companyName: company?.name || "",
          personName: person?.fullName || "",
          documentType: documentType?.name || "",
          documentTypeCode: documentType?.code || "",
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          status: doc.status,
          uploadedBy: uploaderProfile?.fullName || "",
          uploadedAt: doc.uploadedAt,
          reviewedBy: reviewerProfile?.fullName || "",
          reviewedAt: doc.reviewedAt || "",
          rejectionReason: doc.rejectionReason || "",
          expiryDate: doc.expiryDate || "",
          version: doc.version,
          isLatest: doc.isLatest ? "Yes" : "No",
        };
      })
    );

    return enrichedDocuments;
  },
});

/**
 * Export tasks data
 */
export const exportTasks = query({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
    priorityFilter: v.optional(v.string()),
    assignedToId: v.optional(v.id("users")),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get all tasks
    let tasks = await ctx.db.query("tasks").collect();

    // Apply role-based filtering via collective process company
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Filter by company through collectiveProcess
      const filteredTasks = await Promise.all(
        tasks.map(async (task) => {
          if (task.collectiveProcessId) {
            const collectiveProcess = await ctx.db.get(task.collectiveProcessId);
            if (collectiveProcess && collectiveProcess.companyId === userProfile.companyId) {
              return task;
            }
          }
          return null;
        })
      );
      tasks = filteredTasks.filter((t) => t !== null) as typeof tasks;
    } else if (args.companyId) {
      // Admin can filter by specific company
      const filteredTasks = await Promise.all(
        tasks.map(async (task) => {
          if (task.collectiveProcessId) {
            const collectiveProcess = await ctx.db.get(task.collectiveProcessId);
            if (collectiveProcess && collectiveProcess.companyId === args.companyId) {
              return task;
            }
          }
          return null;
        })
      );
      tasks = filteredTasks.filter((t) => t !== null) as typeof tasks;
    }

    // Apply filters
    if (args.statusFilter) {
      tasks = tasks.filter((t) => t.status === args.statusFilter);
    }

    if (args.priorityFilter) {
      tasks = tasks.filter((t) => t.priority === args.priorityFilter);
    }

    if (args.assignedToId) {
      tasks = tasks.filter((t) => t.assignedTo === args.assignedToId);
    }

    // Apply date range filter (by due date)
    if (args.dateFrom) {
      tasks = tasks.filter((t) => t.dueDate && t.dueDate >= args.dateFrom!);
    }
    if (args.dateTo) {
      tasks = tasks.filter((t) => t.dueDate && t.dueDate <= args.dateTo!);
    }

    // Enrich with related data
    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const [individualProcess, collectiveProcess] = await Promise.all([
          task.individualProcessId ? ctx.db.get(task.individualProcessId) : null,
          task.collectiveProcessId ? ctx.db.get(task.collectiveProcessId) : null,
        ]);

        // Get person and company
        const [person, company] = await Promise.all([
          individualProcess ? ctx.db.get(individualProcess.personId) : null,
          collectiveProcess && collectiveProcess.companyId ? ctx.db.get(collectiveProcess.companyId) : null,
        ]);

        // Get assignee and creator profiles
        const assignedToId = task.assignedTo;
        const [assigneeProfile, creatorProfile, completerProfile] = await Promise.all([
          assignedToId ? ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", assignedToId))
            .first() : null,
          ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", task.createdBy))
            .first(),
          task.completedBy
            ? ctx.db
                .query("userProfiles")
                .withIndex("by_userId", (q) => q.eq("userId", task.completedBy!))
                .first()
            : null,
        ]);

        return {
          id: task._id,
          collectiveProcessReference: collectiveProcess?.referenceNumber || "",
          companyName: company?.name || "",
          personName: person?.fullName || "",
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          priority: task.priority,
          status: task.status,
          assignedTo: assigneeProfile?.fullName || "",
          createdBy: creatorProfile?.fullName || "",
          completedBy: completerProfile?.fullName || "",
          completedAt: task.completedAt || "",
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      })
    );

    return enrichedTasks;
  },
});
