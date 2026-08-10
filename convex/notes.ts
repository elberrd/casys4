import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireActiveUserProfile } from "./lib/auth";
import { createCachedGet } from "./lib/cachedGet";
import { internal } from "./_generated/api";

function getFullName(person: { givenNames: string; middleName?: string; surname?: string }): string {
  return [person.givenNames, person.middleName, person.surname].filter(Boolean).join(" ");
}

const noteFieldsValidator = {
  _id: v.id("notes"),
  _creationTime: v.number(),
  content: v.string(),
  date: v.string(),
  requestedByPersonId: v.optional(v.id("people")),
  communicationChannel: v.optional(v.string()),
  subject: v.optional(v.string()),
  alarmDate: v.optional(v.string()),
  alarmNotifiedAt: v.optional(v.number()),
  attachmentCount: v.optional(v.number()),
  individualProcessId: v.optional(v.id("individualProcesses")),
  collectiveProcessId: v.optional(v.id("collectiveProcesses")),
  createdBy: v.id("users"),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
};

const createdByUserValidator = v.union(
  v.object({
    _id: v.id("userProfiles"),
    userId: v.optional(v.id("users")),
    fullName: v.string(),
    email: v.string(),
  }),
  v.null(),
);

const requestedByPersonValidator = v.union(
  v.object({
    _id: v.id("people"),
    fullName: v.string(),
  }),
  v.null(),
);

const processNoteValidator = v.object({
  ...noteFieldsValidator,
  createdByUser: createdByUserValidator,
  requestedByPerson: requestedByPersonValidator,
});

const allNotesValidator = v.object({
  ...noteFieldsValidator,
  candidateName: v.union(v.string(), v.null()),
  processReference: v.union(v.string(), v.null()),
  individualProcess: v.union(
    v.object({
      _id: v.id("individualProcesses"),
      collectiveProcessId: v.optional(v.id("collectiveProcesses")),
      personId: v.optional(v.id("people")),
      status: v.optional(v.string()),
    }),
    v.null(),
  ),
  collectiveProcess: v.union(
    v.object({
      _id: v.id("collectiveProcesses"),
      reference: v.string(),
      processTypeId: v.optional(v.id("processTypes")),
      companyId: v.optional(v.id("companies")),
    }),
    v.null(),
  ),
  createdByUser: createdByUserValidator,
  requestedByPerson: requestedByPersonValidator,
});

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getDateInSaoPaulo(timestamp = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

function validateAlarmDate(alarmDate: string): void {
  if (!DATE_ONLY_PATTERN.test(alarmDate)) {
    throw new Error("Alarm date must use YYYY-MM-DD format");
  }
  const parsed = Date.parse(`${alarmDate}T03:00:00.000Z`);
  if (!Number.isFinite(parsed)) throw new Error("Alarm date is invalid");
  if (new Date(parsed).toISOString().slice(0, 10) !== alarmDate) {
    throw new Error("Alarm date is invalid");
  }
  if (alarmDate < getDateInSaoPaulo()) {
    throw new Error("Alarm date cannot be in the past");
  }
}

function normalizeCommunicationChannel(communicationChannel: string): string {
  const normalized = communicationChannel.trim();
  if (!normalized) throw new Error("Communication channel is required");
  if (normalized.length > 100) {
    throw new Error("Communication channel is too long");
  }
  return normalized;
}

async function scheduleNoteAlarm(
  ctx: MutationCtx,
  noteId: Id<"notes">,
  alarmDate: string,
) {
  const alarmTimestamp = Date.parse(`${alarmDate}T03:00:00.000Z`);
  await ctx.scheduler.runAt(
    Math.max(alarmTimestamp, Date.now()),
    internal.noteReminders.sendNoteAlarm,
    { noteId, expectedAlarmDate: alarmDate },
  );
}

/**
 * Query to list ALL notes across all processes with enriched process/candidate information
 * Used for the standalone Notes page
 * Access control: Admins see all notes, clients see only notes for their company's processes
 */
export const listAll = query({
  args: {},
  returns: v.array(allNotesValidator),
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Get all active notes
    let notes = await ctx.db
      .query("notes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Apply role-based access control for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Filter notes by company - check process ownership
      const filteredByCompany: Doc<"notes">[] = [];
      for (const note of notes) {
        // Check individualProcess's collectiveProcess company
        if (note.individualProcessId) {
          const individualProcess = await cachedGet(note.individualProcessId);
          if (individualProcess && individualProcess.collectiveProcessId) {
            const collectiveProcess = await cachedGet(
              individualProcess.collectiveProcessId
            );
            if (
              collectiveProcess &&
              collectiveProcess.companyId === userProfile.companyId
            ) {
              filteredByCompany.push(note);
              continue;
            }
          }
        }

        // Check collectiveProcess directly
        if (note.collectiveProcessId) {
          const collectiveProcess = await cachedGet(note.collectiveProcessId);
          if (
            collectiveProcess &&
            collectiveProcess.companyId === userProfile.companyId
          ) {
            filteredByCompany.push(note);
          }
        }
      }

      notes = filteredByCompany;
    }

    // Enrich with process and candidate information
    const enrichedResults = await Promise.all(
      notes.map(async (note) => {
        // Get creator user info
        const createdByProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", note.createdBy))
          .first();

        let candidateName: string | null = null;
        let processReference: string | null = null;
        let individualProcess = null;
        let collectiveProcess = null;
        const requestedByPerson = note.requestedByPersonId
          ? await cachedGet(note.requestedByPersonId)
          : null;

        // Get individual process and candidate info
        if (note.individualProcessId) {
          individualProcess = await cachedGet(note.individualProcessId);
          if (individualProcess) {
            // Get person (candidate) information
            if (individualProcess.personId) {
              const person = await cachedGet(individualProcess.personId);
              if (person) {
                candidateName = getFullName(person);
              }
            }

            // Get collective process for reference
            if (individualProcess.collectiveProcessId) {
              collectiveProcess = await cachedGet(
                individualProcess.collectiveProcessId
              );
              if (collectiveProcess) {
                processReference = collectiveProcess.referenceNumber;
              }
            }
          }
        }

        // Get collective process info if not already fetched
        if (note.collectiveProcessId && !collectiveProcess) {
          collectiveProcess = await cachedGet(note.collectiveProcessId);
          if (collectiveProcess) {
            processReference = collectiveProcess.referenceNumber;
          }
        }

        return {
          ...note,
          candidateName,
          processReference,
          individualProcess: individualProcess
            ? {
                _id: individualProcess._id,
                collectiveProcessId: individualProcess.collectiveProcessId,
                personId: individualProcess.personId,
                status: individualProcess.status,
              }
            : null,
          collectiveProcess: collectiveProcess
            ? {
                _id: collectiveProcess._id,
                reference: collectiveProcess.referenceNumber,
                processTypeId: collectiveProcess.processTypeId,
                companyId: collectiveProcess.companyId,
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
          requestedByPerson: requestedByPerson
            ? {
                _id: requestedByPerson._id,
                fullName: getFullName(requestedByPerson),
              }
            : null,
        };
      })
    );

    // Sort by createdAt descending (newest first)
    return enrichedResults.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Query to list notes for a process (individual or collective)
 * Access control: Admins see all notes, clients see only notes for their company's processes
 */
export const list = query({
  args: {
    individualProcessId: v.optional(v.id("individualProcesses")),
    collectiveProcessId: v.optional(v.id("collectiveProcesses")),
  },
  returns: v.array(processNoteValidator),
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    // Deduped document reads across enriched rows
    const cachedGet = createCachedGet(ctx.db);

    // Validate that at least one process ID is provided
    if (!args.individualProcessId && !args.collectiveProcessId) {
      throw new Error(
        "Either individualProcessId or collectiveProcessId must be provided"
      );
    }

    let results: Doc<"notes">[] = [];

    // Query notes based on process type
    if (args.individualProcessId) {
      results = await ctx.db
        .query("notes")
        .withIndex("by_individualProcess_active", (q) =>
          q.eq("individualProcessId", args.individualProcessId).eq("isActive", true)
        )
        .collect();
    } else if (args.collectiveProcessId) {
      results = await ctx.db
        .query("notes")
        .withIndex("by_collectiveProcess_active", (q) =>
          q.eq("collectiveProcessId", args.collectiveProcessId).eq("isActive", true)
        )
        .collect();
    }

    // Apply role-based access control for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Filter notes by company - check process ownership
      const filteredByCompany: Doc<"notes">[] = [];
      for (const note of results) {
        // Check individualProcess's collectiveProcess company
        if (note.individualProcessId) {
          const individualProcess = await cachedGet(note.individualProcessId);
          if (individualProcess && individualProcess.collectiveProcessId) {
            const collectiveProcess = await cachedGet(
              individualProcess.collectiveProcessId
            );
            if (
              collectiveProcess &&
              collectiveProcess.companyId === userProfile.companyId
            ) {
              filteredByCompany.push(note);
              continue;
            }
          }
        }

        // Check collectiveProcess directly
        if (note.collectiveProcessId) {
          const collectiveProcess = await cachedGet(note.collectiveProcessId);
          if (
            collectiveProcess &&
            collectiveProcess.companyId === userProfile.companyId
          ) {
            filteredByCompany.push(note);
          }
        }
      }

      results = filteredByCompany;
    }

    // Enrich with creator user info
    const enrichedResults = await Promise.all(
      results.map(async (note) => {
        const createdByProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", note.createdBy))
          .first();
        const requestedByPerson = note.requestedByPersonId
          ? await cachedGet(note.requestedByPersonId)
          : null;

        return {
          ...note,
          createdByUser: createdByProfile
            ? {
                _id: createdByProfile._id,
                userId: createdByProfile.userId,
                fullName: createdByProfile.fullName,
                email: createdByProfile.email,
              }
            : null,
          requestedByPerson: requestedByPerson
            ? {
                _id: requestedByPerson._id,
                fullName: getFullName(requestedByPerson),
              }
            : null,
        };
      })
    );

    // Sort by date descending (newest first)
    return enrichedResults.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },
});

/**
 * Query to get notes count for an individual process
 * Optimized for table display - returns only count, not full note objects
 */
export const countByIndividualProcess = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Query notes for the individual process using index
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_individualProcess_active", (q) =>
        q.eq("individualProcessId", args.individualProcessId).eq("isActive", true)
      )
      .collect();

    // Apply role-based access control for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Check individualProcess's collectiveProcess company
      const individualProcess = await ctx.db.get(args.individualProcessId);
      if (!individualProcess || !individualProcess.collectiveProcessId) {
        return 0;
      }

      const collectiveProcess = await ctx.db.get(
        individualProcess.collectiveProcessId
      );
      if (
        !collectiveProcess ||
        collectiveProcess.companyId !== userProfile.companyId
      ) {
        return 0;
      }
    }

    return notes.length;
  },
});

/**
 * Query to get a single note by ID
 */
export const get = query({
  args: { id: v.id("notes") },
  returns: v.union(processNoteValidator, v.null()),
  handler: async (ctx, { id }) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const note = await ctx.db.get(id);

    if (!note || !note.isActive) {
      return null;
    }

    // Apply role-based access control for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Check individualProcess's collectiveProcess company
      if (note.individualProcessId) {
        const individualProcess = await ctx.db.get(note.individualProcessId);
        if (individualProcess && individualProcess.collectiveProcessId) {
          const collectiveProcess = await ctx.db.get(
            individualProcess.collectiveProcessId
          );
          if (
            !collectiveProcess ||
            collectiveProcess.companyId !== userProfile.companyId
          ) {
            throw new Error(
              "Access denied: Note does not belong to your company"
            );
          }
        }
      }

      // Check collectiveProcess directly
      if (note.collectiveProcessId) {
        const collectiveProcess = await ctx.db.get(note.collectiveProcessId);
        if (
          !collectiveProcess ||
          collectiveProcess.companyId !== userProfile.companyId
        ) {
          throw new Error("Access denied: Note does not belong to your company");
        }
      }
    }

    // Enrich with creator user info
    const createdByUser = await ctx.db.get(note.createdBy);

    const createdByProfile = createdByUser
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", createdByUser._id))
          .first()
      : null;
    const requestedByPerson = note.requestedByPersonId
      ? await ctx.db.get(note.requestedByPersonId)
      : null;

    return {
      ...note,
      createdByUser: createdByProfile
        ? {
            _id: createdByProfile._id,
            userId: createdByProfile.userId,
            fullName: createdByProfile.fullName,
            email: createdByProfile.email,
          }
        : null,
      requestedByPerson: requestedByPerson
        ? {
            _id: requestedByPerson._id,
            fullName: getFullName(requestedByPerson),
          }
        : null,
    };
  },
});

/**
 * Create a new note
 * Both admins and clients can create notes for processes they have access to
 */
export const create = mutation({
  args: {
    content: v.string(),
    requestedByPersonId: v.id("people"),
    communicationChannel: v.string(),
    subject: v.string(),
    alarmDate: v.optional(v.string()),
    individualProcessId: v.optional(v.id("individualProcesses")),
    collectiveProcessId: v.optional(v.id("collectiveProcesses")),
  },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const userProfile = await requireActiveUserProfile(ctx);

    // Validate that exactly one process ID is provided
    if (!args.individualProcessId && !args.collectiveProcessId) {
      throw new Error(
        "Either individualProcessId or collectiveProcessId must be provided"
      );
    }

    if (args.individualProcessId && args.collectiveProcessId) {
      throw new Error(
        "Only one of individualProcessId or collectiveProcessId should be provided"
      );
    }

    // Validate content
    if (!args.content || args.content.trim().length === 0) {
      throw new Error("Note content is required");
    }
    const subject = args.subject.trim();
    if (!subject) throw new Error("Note subject is required");
    if (subject.length > 200) throw new Error("Note subject is too long");
    const requestedByPerson = await ctx.db.get(args.requestedByPersonId);
    if (!requestedByPerson) throw new Error("Requested-by person not found");
    const communicationChannel = normalizeCommunicationChannel(
      args.communicationChannel,
    );
    if (args.alarmDate) validateAlarmDate(args.alarmDate);

    // Apply role-based access control for client users
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Check individualProcess's collectiveProcess company
      if (args.individualProcessId) {
        const individualProcess = await ctx.db.get(args.individualProcessId);
        if (!individualProcess) {
          throw new Error("Individual process not found");
        }
        if (individualProcess.collectiveProcessId) {
          const collectiveProcess = await ctx.db.get(
            individualProcess.collectiveProcessId
          );
          if (
            !collectiveProcess ||
            collectiveProcess.companyId !== userProfile.companyId
          ) {
            throw new Error(
              "Access denied: Process does not belong to your company"
            );
          }
        }
      }

      // Check collectiveProcess directly
      if (args.collectiveProcessId) {
        const collectiveProcess = await ctx.db.get(args.collectiveProcessId);
        if (
          !collectiveProcess ||
          collectiveProcess.companyId !== userProfile.companyId
        ) {
          throw new Error(
            "Access denied: Process does not belong to your company"
          );
        }
      }
    } else {
      // Admin user - verify process exists
      if (args.individualProcessId) {
        const individualProcess = await ctx.db.get(args.individualProcessId);
        if (!individualProcess) {
          throw new Error("Individual process not found");
        }
      }

      if (args.collectiveProcessId) {
        const collectiveProcess = await ctx.db.get(args.collectiveProcessId);
        if (!collectiveProcess) {
          throw new Error("Collective process not found");
        }
      }
    }

    const now = Date.now();
    const today = getDateInSaoPaulo();

    const noteId = await ctx.db.insert("notes", {
      content: args.content,
      date: today,
      requestedByPersonId: args.requestedByPersonId,
      communicationChannel,
      subject,
      alarmDate: args.alarmDate,
      attachmentCount: 0,
      individualProcessId: args.individualProcessId,
      collectiveProcessId: args.collectiveProcessId,
      createdBy: userProfile.userId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    if (args.alarmDate) {
      await scheduleNoteAlarm(ctx, noteId, args.alarmDate);
    }

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "notes",
        entityId: noteId,
        details: {
          individualProcessId: args.individualProcessId,
          collectiveProcessId: args.collectiveProcessId,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return noteId;
  },
});

/**
 * Update an existing note
 * Only the creator or an admin can update a note
 */
export const update = mutation({
  args: {
    id: v.id("notes"),
    content: v.optional(v.string()),
    requestedByPersonId: v.optional(v.id("people")),
    communicationChannel: v.optional(v.string()),
    subject: v.optional(v.string()),
    alarmDate: v.optional(v.string()),
    clearAlarm: v.optional(v.boolean()),
  },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const userProfile = await requireActiveUserProfile(ctx);

    const note = await ctx.db.get(args.id);
    if (!note || !note.isActive) {
      throw new Error("Note not found");
    }

    // Check permissions: only creator or admin can update
    if (userProfile.role !== "admin" && note.createdBy !== userProfile.userId) {
      throw new Error("Access denied: Only the note creator or an admin can update this note");
    }

    // Validate content if provided
    if (args.content !== undefined) {
      if (!args.content || args.content.trim().length === 0) {
        throw new Error("Note content is required");
      }
    }
    if (args.requestedByPersonId !== undefined) {
      const requestedByPerson = await ctx.db.get(args.requestedByPersonId);
      if (!requestedByPerson) throw new Error("Requested-by person not found");
    }
    const communicationChannel =
      args.communicationChannel === undefined
        ? undefined
        : normalizeCommunicationChannel(args.communicationChannel);
    const subject = args.subject?.trim();
    if (args.subject !== undefined && !subject) {
      throw new Error("Note subject is required");
    }
    if (subject && subject.length > 200) {
      throw new Error("Note subject is too long");
    }
    if (args.alarmDate !== undefined) validateAlarmDate(args.alarmDate);

    const nextAlarmDate = args.clearAlarm
      ? undefined
      : (args.alarmDate ?? note.alarmDate);
    const alarmChanged = nextAlarmDate !== note.alarmDate;

    const updateData: {
      content?: string;
      requestedByPersonId?: Id<"people">;
      communicationChannel?: string;
      subject?: string;
      alarmDate?: string;
      alarmNotifiedAt?: number;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.content !== undefined) updateData.content = args.content;
    if (args.requestedByPersonId !== undefined) {
      updateData.requestedByPersonId = args.requestedByPersonId;
    }
    if (communicationChannel !== undefined) {
      updateData.communicationChannel = communicationChannel;
    }
    if (subject !== undefined) updateData.subject = subject;
    if (alarmChanged) {
      updateData.alarmDate = nextAlarmDate;
      updateData.alarmNotifiedAt = undefined;
    }

    await ctx.db.patch(args.id, updateData);

    if (alarmChanged && nextAlarmDate) {
      await scheduleNoteAlarm(ctx, args.id, nextAlarmDate);
    }

    // Log activity (non-blocking)
    try {
      const changedFields: Record<string, { before: string | undefined; after: string | undefined }> = {};
      if (args.content !== undefined && args.content !== note.content) {
        changedFields.content = { before: "...", after: "..." }; // Don't log full content
      }

      if (Object.keys(changedFields).length > 0) {
        await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
          userId: userProfile.userId,
          action: "updated",
          entityType: "notes",
          entityId: args.id,
          details: {
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
 * Delete a note (soft delete)
 * Only the creator or an admin can delete a note
 */
export const remove = mutation({
  args: { id: v.id("notes") },
  returns: v.id("notes"),
  handler: async (ctx, { id }) => {
    const userProfile = await requireActiveUserProfile(ctx);

    const note = await ctx.db.get(id);
    if (!note || !note.isActive) {
      throw new Error("Note not found");
    }

    // Check permissions: only creator or admin can delete
    if (userProfile.role !== "admin" && note.createdBy !== userProfile.userId) {
      throw new Error("Access denied: Only the note creator or an admin can delete this note");
    }

    // Soft delete
    await ctx.db.patch(id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    const attachments = await ctx.db
      .query("noteAttachments")
      .withIndex("by_note", (q) => q.eq("noteId", id))
      .collect();
    for (const attachment of attachments) {
      await ctx.db.delete(attachment._id);
      await ctx.storage.delete(attachment.storageId);
    }

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "notes",
        entityId: id,
        details: {
          individualProcessId: note.individualProcessId,
          collectiveProcessId: note.collectiveProcessId,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return id;
  },
});
