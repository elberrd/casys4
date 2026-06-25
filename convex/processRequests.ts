import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  getCurrentUserProfile,
  requireClient,
  getClientCurrentCompanyIds,
} from "./lib/auth";
import { logActivitySafely } from "./lib/activityLogger";
import { runProcessCreationSideEffects } from "./lib/createIndividualProcess";

/**
 * Process Requests ("Solicitações").
 *
 * A client-originated process IS an `individualProcesses` row — there is no
 * separate request table and no data copy. The row carries a `requestStatus`:
 *   "draft"      => the client is still building it in the wizard (hidden from
 *                   the main process list / dashboard / selectors).
 *   "solicitado" => the client finalized it; all process side effects fired and
 *                   the row is a live process, flagged as client-originated.
 *
 * The person-level fields collected in the wizard (e-mail, estado civil,
 * filiação) are written straight onto the `people` record as the client edits.
 */

function getFullName(person: {
  givenNames: string;
  middleName?: string;
  surname?: string;
}): string {
  return [person.givenNames, person.middleName, person.surname]
    .filter(Boolean)
    .join(" ");
}

// ---------------------------------------------------------------------------
// Editable field sets (shared between createDraft and saveDraft)
// ---------------------------------------------------------------------------

/** Process-level fields stored directly on the individualProcesses row. */
const editableProcessFields = {
  passportId: v.optional(v.id("passports")),
  legalFrameworkId: v.optional(v.id("legalFrameworks")),
  consulateId: v.optional(v.id("consulates")),
  urgent: v.optional(v.boolean()),
  dateProcess: v.optional(v.string()),
  requestNotes: v.optional(v.string()),
  // Salary block
  lastSalaryCurrency: v.optional(v.string()),
  lastSalaryAmount: v.optional(v.number()),
  exchangeRateToBRL: v.optional(v.number()),
  salaryInBRL: v.optional(v.number()),
  monthlyAmountToReceive: v.optional(v.number()),
  // Visa receipt + foreign residence
  visaReceiptLocation: v.optional(
    v.union(v.literal("brazil"), v.literal("abroad"))
  ),
  residenceCountryCode: v.optional(v.string()),
  residenceCountryName: v.optional(v.string()),
  residenceStateCode: v.optional(v.string()),
  residenceCity: v.optional(v.string()),
  residenceSince: v.optional(v.string()),
  residenceAddressAbroad: v.optional(v.string()),
  consularPost: v.optional(v.string()),
  professionalExperience: v.optional(v.string()),
};

/** Person-level fields applied to the `people` record (not the process). */
const editablePersonFields = {
  candidateEmail: v.optional(v.string()),
  maritalStatus: v.optional(v.string()),
  fatherName: v.optional(v.string()),
  motherName: v.optional(v.string()),
};

type ProcessArgs = Partial<Record<keyof typeof editableProcessFields, unknown>>;
type PersonArgs = Partial<Record<keyof typeof editablePersonFields, unknown>>;

/** Builds the patch of process-level fields that were provided. */
function buildProcessPatch(args: ProcessArgs): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(editableProcessFields)) {
    const value = (args as Record<string, unknown>)[key];
    if (value !== undefined) patch[key] = value;
  }
  return patch;
}

/**
 * Apply the person-level wizard fields to the candidate's `people` record
 * immediately (Q3: write straight to the person as the client edits).
 */
async function applyPersonFields(
  ctx: MutationCtx,
  personId: Id<"people">,
  args: PersonArgs,
  now: number
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (args.candidateEmail !== undefined) patch.email = args.candidateEmail;
  if (args.maritalStatus !== undefined) patch.maritalStatus = args.maritalStatus;
  if (args.fatherName !== undefined) patch.fatherName = args.fatherName;
  if (args.motherName !== undefined) patch.motherName = args.motherName;
  if (Object.keys(patch).length > 0) {
    patch.updatedAt = now;
    await ctx.db.patch(personId, patch);
  }
}

/**
 * Derive the authorization type (processType) from a legal framework via the
 * processTypesLegalFrameworks junction. A framework may map to several types;
 * we take the first deterministic match. Returns undefined when none exists.
 */
async function deriveProcessTypeId(
  ctx: MutationCtx,
  legalFrameworkId: Id<"legalFrameworks">
): Promise<Id<"processTypes"> | undefined> {
  const link = await ctx.db
    .query("processTypesLegalFrameworks")
    .withIndex("by_legalFramework", (q) =>
      q.eq("legalFrameworkId", legalFrameworkId)
    )
    .first();
  return link?.processTypeId;
}

/**
 * Guard who a client may attach a request to. Allowed when the person is a
 * current member of one of the client's companies, OR is an unlinked candidate
 * the client created (people.createdBy). Blocks attaching to / editing the PII
 * of a person owned by another company or created by someone else.
 */
async function assertClientMayUsePerson(
  ctx: MutationCtx,
  profile: Doc<"userProfiles">,
  personId: Id<"people">
): Promise<void> {
  const person = await ctx.db.get(personId);
  if (!person) throw new Error("Person not found");

  const currentCompanyIds = await getClientCurrentCompanyIds(ctx, profile);
  const links = await ctx.db
    .query("peopleCompanies")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  const currentLinks = links.filter((l) => l.isCurrent && l.companyId);

  if (currentLinks.length === 0) {
    // Unlinked candidate: only the client who created it may use it.
    if (person.createdBy && person.createdBy === profile.userId) return;
    throw new Error(
      "Access denied: you cannot attach a request to this person"
    );
  }

  const belongsToClient = currentLinks.some(
    (l) => l.companyId && currentCompanyIds.has(l.companyId)
  );
  if (!belongsToClient) {
    throw new Error("Access denied: this person belongs to another company");
  }
}

/**
 * Ensure a client-supplied passport actually belongs to the candidate person
 * (or is unassigned), preventing cross-tenant passport attachment/PII leakage.
 */
async function assertPassportBelongsToPerson(
  ctx: MutationCtx,
  passportId: Id<"passports">,
  personId: Id<"people">
): Promise<void> {
  const passport = await ctx.db.get(passportId);
  if (!passport) throw new Error("Passport not found");
  if (passport.personId && passport.personId !== personId) {
    throw new Error("Access denied: this passport belongs to another person");
  }
}

/**
 * Ensure a legal framework is actually offered to clients (showInRequest) and
 * active before it can be used in a request. Throws otherwise.
 */
async function assertFrameworkAvailable(
  ctx: MutationCtx,
  legalFrameworkId: Id<"legalFrameworks">
): Promise<void> {
  const framework = await ctx.db.get(legalFrameworkId);
  if (!framework || framework.isActive === false || !framework.showInRequest) {
    throw new Error(
      "Access denied: this legal framework is not available for requests"
    );
  }
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

async function enrichRequest(ctx: QueryCtx, process: Doc<"individualProcesses">) {
  const [
    companyApplicant,
    userApplicantCompany,
    person,
    passport,
    processType,
    legalFramework,
    consulateRaw,
  ] = await Promise.all([
    process.companyApplicantId
      ? ctx.db.get(process.companyApplicantId)
      : null,
    process.userApplicantCompanyId
      ? ctx.db.get(process.userApplicantCompanyId)
      : null,
    ctx.db.get(process.personId),
    process.passportId ? ctx.db.get(process.passportId) : null,
    process.processTypeId ? ctx.db.get(process.processTypeId) : null,
    process.legalFrameworkId ? ctx.db.get(process.legalFrameworkId) : null,
    process.consulateId ? ctx.db.get(process.consulateId) : null,
  ]);

  let consulate = null;
  if (consulateRaw) {
    const consulateCity = consulateRaw.cityId
      ? await ctx.db.get(consulateRaw.cityId)
      : null;
    consulate = { ...consulateRaw, city: consulateCity };
  }

  // The requester company (clients map both companyApplicantId and
  // userApplicantCompanyId to their current company).
  const company = companyApplicant ?? userApplicantCompany;

  let requesterProfile = null;
  if (process.requestedBy) {
    requesterProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", process.requestedBy!))
      .first();
  }

  return {
    ...process,
    company,
    person: person ? { ...person, fullName: getFullName(person) } : null,
    passport,
    processType,
    legalFramework,
    consulate,
    requesterProfile,
  };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function notifyAdmins(
  ctx: MutationCtx,
  payload: { type: string; title: string; message: string; entityId: string }
) {
  const admins = await ctx.db
    .query("userProfiles")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .collect();

  for (const admin of admins) {
    if (!admin.userId || !admin.isActive) continue;
    await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
      userId: admin.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      entityType: "processRequest",
      entityId: payload.entityId,
    });
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * List process requests (rows with a requestStatus).
 * - Admins see all requests (draft + solicitado), optionally filtered.
 * - Clients see only the requests they created.
 */
export const list = query({
  args: {
    requestStatus: v.optional(
      v.union(v.literal("draft"), v.literal("solicitado"))
    ),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    let results: Doc<"individualProcesses">[];

    if (userProfile.role === "client") {
      const userId = userProfile.userId;
      if (!userId) return [];
      results = await ctx.db
        .query("individualProcesses")
        .withIndex("by_requestedBy", (q) => q.eq("requestedBy", userId))
        .collect();
    } else {
      // Admin: all client-originated rows (draft + solicitado).
      const [drafts, solicitados] = await Promise.all([
        ctx.db
          .query("individualProcesses")
          .withIndex("by_requestStatus", (q) => q.eq("requestStatus", "draft"))
          .collect(),
        ctx.db
          .query("individualProcesses")
          .withIndex("by_requestStatus", (q) =>
            q.eq("requestStatus", "solicitado")
          )
          .collect(),
      ]);
      results = [...drafts, ...solicitados];
    }

    if (args.requestStatus !== undefined) {
      results = results.filter((r) => r.requestStatus === args.requestStatus);
    }
    if (args.companyId !== undefined) {
      results = results.filter(
        (r) =>
          r.companyApplicantId === args.companyId ||
          r.userApplicantCompanyId === args.companyId
      );
    }

    const enriched = await Promise.all(
      results.map((process) => enrichRequest(ctx, process))
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Get a single process request, enriched. Clients may only access their own.
 */
export const get = query({
  args: { id: v.id("individualProcesses") },
  handler: async (ctx, { id }) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const process = await ctx.db.get(id);
    if (!process) return null;

    if (
      userProfile.role === "client" &&
      process.requestedBy !== userProfile.userId
    ) {
      throw new Error(
        "Access denied: You do not have permission to view this request"
      );
    }

    return enrichRequest(ctx, process);
  },
});

// ---------------------------------------------------------------------------
// Draft lifecycle (client)
// ---------------------------------------------------------------------------

/**
 * Create a new draft requested process (client only). Created once the wizard
 * has a candidate (passport step) and a legal framework. Registered under the
 * client's CURRENT company. No process side effects run yet — those fire on
 * finalize.
 */
export const createDraft = mutation({
  args: {
    personId: v.id("people"),
    ...editableProcessFields,
    ...editablePersonFields,
  },
  handler: async (ctx, args) => {
    const { profile, companyId } = await requireClient(ctx);
    if (!profile.userId) {
      throw new Error("User profile not activated");
    }

    // Guard: the candidate must be the client's own / own-company person; the
    // passport must belong to that person; the legal framework must be offered.
    await assertClientMayUsePerson(ctx, profile, args.personId);
    if (args.passportId) {
      await assertPassportBelongsToPerson(ctx, args.passportId, args.personId);
    }
    if (args.legalFrameworkId) {
      await assertFrameworkAvailable(ctx, args.legalFrameworkId);
    }

    const now = Date.now();

    // Apply person-level fields to the candidate immediately.
    await applyPersonFields(ctx, args.personId, args, now);

    const processPatch = buildProcessPatch(args);
    const processTypeId = args.legalFrameworkId
      ? await deriveProcessTypeId(ctx, args.legalFrameworkId)
      : undefined;

    const processId = await ctx.db.insert("individualProcesses", {
      personId: args.personId,
      companyApplicantId: companyId,
      userApplicantCompanyId: companyId,
      processTypeId,
      requestStatus: "draft",
      requestedBy: profile.userId,
      isActive: true,
      processStatus: "Atual",
      createdAt: now,
      updatedAt: now,
      ...processPatch,
    });

    await logActivitySafely(ctx, {
      userId: profile.userId,
      action: "created",
      entityType: "processRequest",
      entityId: processId,
      details: { requestStatus: "draft" },
    });

    return processId;
  },
});

/**
 * Save changes to a draft requested process.
 * - Client owner: only while requestStatus is "draft".
 * - Admin: only while requestStatus is "draft".
 * After finalize ("solicitado") the row is a live process; edits go through the
 * normal admin process-update flow.
 */
export const saveDraft = mutation({
  args: {
    id: v.id("individualProcesses"),
    ...editableProcessFields,
    ...editablePersonFields,
  },
  handler: async (ctx, { id, ...rest }) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const process = await ctx.db.get(id);
    if (!process) throw new Error("Process request not found");

    if (userProfile.role === "client") {
      if (process.requestedBy !== userProfile.userId) {
        throw new Error("Access denied: This is not your request");
      }
    } else if (userProfile.role !== "admin") {
      throw new Error("Access denied");
    }

    if (process.requestStatus !== "draft") {
      throw new Error(
        "This request has already been submitted and can no longer be edited as a draft."
      );
    }

    if (rest.legalFrameworkId !== undefined) {
      await assertFrameworkAvailable(ctx, rest.legalFrameworkId);
    }
    if (rest.passportId !== undefined) {
      await assertPassportBelongsToPerson(ctx, rest.passportId, process.personId);
    }

    const now = Date.now();

    await applyPersonFields(ctx, process.personId, rest, now);

    const patch = buildProcessPatch(rest);
    if (rest.legalFrameworkId !== undefined) {
      patch.processTypeId = await deriveProcessTypeId(
        ctx,
        rest.legalFrameworkId
      );
    }
    await ctx.db.patch(id, { ...patch, updatedAt: now });

    return id;
  },
});

/**
 * Finalize a draft requested process (client owner). Flips it to "solicitado",
 * records when it was requested, and runs every process creation side effect so
 * it becomes a live individual process. No admin approval is required.
 */
export const finalize = mutation({
  args: { id: v.id("individualProcesses") },
  handler: async (ctx, { id }) => {
    const userProfile = await getCurrentUserProfile(ctx);
    if (userProfile.role !== "client") {
      throw new Error("Only the requester can finalize a request");
    }
    if (!userProfile.userId) {
      throw new Error("User profile not activated");
    }

    const process = await ctx.db.get(id);
    if (!process) throw new Error("Process request not found");
    if (process.requestedBy !== userProfile.userId) {
      throw new Error("Access denied: This is not your request");
    }
    if (process.requestStatus !== "draft") {
      throw new Error(
        `Cannot finalize a request with status "${process.requestStatus}"`
      );
    }
    if (!process.legalFrameworkId) {
      throw new Error("A legal framework is required before finalizing");
    }

    const now = Date.now();

    await ctx.db.patch(id, {
      requestStatus: "solicitado",
      requestedAt: now,
      updatedAt: now,
    });

    // The request now becomes a live process: status record, document
    // checklists, auto-reuse, activity log.
    await runProcessCreationSideEffects(ctx, id, userProfile.userId);

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "submitted",
      entityType: "processRequest",
      entityId: id,
      details: { requestStatus: "solicitado" },
    });

    const company = process.companyApplicantId
      ? await ctx.db.get(process.companyApplicantId)
      : null;
    await notifyAdmins(ctx, {
      type: "process_request_submitted",
      title: "Nova solicitação de processo",
      message: `${company?.name ?? "Uma empresa"} criou uma nova solicitação de processo.`,
      entityId: id,
    });

    return id;
  },
});

/**
 * Delete a draft requested process (client owner or admin). Only drafts can be
 * removed here; finalized (solicitado) rows are live processes and are deleted
 * through the normal process-removal flow. Cleans up the conversation thread.
 */
export const removeDraft = mutation({
  args: { id: v.id("individualProcesses") },
  handler: async (ctx, { id }) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const process = await ctx.db.get(id);
    if (!process) throw new Error("Process request not found");

    // Authorize first (uniform error for non-owners), then validate status.
    if (
      userProfile.role === "client" &&
      process.requestedBy !== userProfile.userId
    ) {
      throw new Error("Access denied: This is not your request");
    }
    if (userProfile.role !== "client" && userProfile.role !== "admin") {
      throw new Error("Access denied");
    }
    if (process.requestStatus !== "draft") {
      throw new Error(
        "Only draft requests can be deleted here. Finalized requests are deleted from the process list."
      );
    }

    const messages = await ctx.db
      .query("processRequestMessages")
      .withIndex("by_individualProcess", (q) =>
        q.eq("individualProcessId", id)
      )
      .collect();
    for (const m of messages) await ctx.db.delete(m._id);

    await ctx.db.delete(id);

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "deleted",
      entityType: "processRequest",
      entityId: id,
      details: { requestStatus: "draft" },
    });

    return id;
  },
});
