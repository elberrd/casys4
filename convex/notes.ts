import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { getCurrentUserProfile, requireActiveUserProfile } from "./lib/auth";
import { internal } from "./_generated/api";

/**
 * Query to list ALL notes across all processes with enriched process/candidate information
 * Used for the standalone Notes page
 * Access control: Admins see all notes, clients see only notes for their company's processes
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);

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
          const individualProcess = await ctx.db.get(note.individualProcessId);
          if (individualProcess && individualProcess.collectiveProcessId) {
            const collectiveProcess = await ctx.db.get(
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
          const collectiveProcess = await ctx.db.get(note.collectiveProcessId);
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

        // Get individual process and candidate info
        if (note.individualProcessId) {
          individualProcess = await ctx.db.get(note.individualProcessId);
          if (individualProcess) {
            // Get person (candidate) information
            if (individualProcess.personId) {
              const person = await ctx.db.get(individualProcess.personId);
              if (person) {
                candidateName = person.fullName;
              }
            }

            // Get collective process for reference
            if (individualProcess.collectiveProcessId) {
              collectiveProcess = await ctx.db.get(
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
          collectiveProcess = await ctx.db.get(note.collectiveProcessId);
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
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

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
          const individualProcess = await ctx.db.get(note.individualProcessId);
          if (individualProcess && individualProcess.collectiveProcessId) {
            const collectiveProcess = await ctx.db.get(
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
          const collectiveProcess = await ctx.db.get(note.collectiveProcessId);
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
    individualProcessId: v.optional(v.id("individualProcesses")),
    collectiveProcessId: v.optional(v.id("collectiveProcesses")),
  },
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
    const today = new Date().toISOString().split("T")[0];

    const noteId = await ctx.db.insert("notes", {
      content: args.content,
      date: today,
      individualProcessId: args.individualProcessId,
      collectiveProcessId: args.collectiveProcessId,
      createdBy: userProfile.userId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

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
  },
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

    const updateData: {
      content?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.content !== undefined) updateData.content = args.content;

    await ctx.db.patch(args.id, updateData);

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
