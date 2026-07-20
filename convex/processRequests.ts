import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  getCurrentUserProfile,
  requireClient,
  getClientCurrentCompanyIds,
} from "./lib/auth";
import { personOwnedByClient, gatePersonPII } from "./lib/personOwnership";
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
    v.union(v.literal("brazil"), v.literal("abroad")),
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
 * immediately (write straight to the person as the client edits).
 *
 * `overwrite` gates whether existing values may be replaced: it is true for a
 * person the client owns (own candidate / own company) or for admins, and false
 * for a cross-tenant dedup link, where we only fill gaps so another tenant's PII
 * is never clobbered.
 */
async function applyPersonFields(
  ctx: MutationCtx,
  personId: Id<"people">,
  args: PersonArgs,
  now: number,
  overwrite: boolean,
): Promise<void> {
  const person = await ctx.db.get(personId);
  if (!person) return;

  const patch: Record<string, unknown> = {};
  if (args.candidateEmail !== undefined && (overwrite || !person.email))
    patch.email = args.candidateEmail;
  if (args.maritalStatus !== undefined && (overwrite || !person.maritalStatus))
    patch.maritalStatus = args.maritalStatus;
  if (args.fatherName !== undefined && (overwrite || !person.fatherName))
    patch.fatherName = args.fatherName;
  if (args.motherName !== undefined && (overwrite || !person.motherName))
    patch.motherName = args.motherName;
  if (Object.keys(patch).length > 0) {
    patch.updatedAt = now;
    await ctx.db.patch(personId, patch);
  }
}

/** Random, collision-resistant grouping key for a multi-candidate request. */
function generateRequestGroupId(): string {
  const rand = () => Math.random().toString(36).slice(2, 11);
  return `rg_${Date.now().toString(36)}_${rand()}${rand()}`;
}

/**
 * Derive the authorization type (processType) from a legal framework via the
 * processTypesLegalFrameworks junction. A framework may map to several types;
 * we take the first deterministic match. Returns undefined when none exists.
 */
async function deriveProcessTypeId(
  ctx: MutationCtx,
  legalFrameworkId: Id<"legalFrameworks">,
): Promise<Id<"processTypes"> | undefined> {
  const link = await ctx.db
    .query("processTypesLegalFrameworks")
    .withIndex("by_legalFramework", (q) =>
      q.eq("legalFrameworkId", legalFrameworkId),
    )
    .first();
  return link?.processTypeId;
}

/**
 * Ensure the candidate person exists. Per product decision, a client may attach
 * a request to ANY existing person (e.g. a cross-tenant dedup match by exact
 * name from a passport they hold); PII overwrites stay gated by clientOwnsPerson
 * at the field-write level.
 */
async function assertPersonExists(
  ctx: MutationCtx,
  personId: Id<"people">,
): Promise<void> {
  const person = await ctx.db.get(personId);
  if (!person) throw new Error("Person not found");
}

/**
 * Ensure a client-supplied passport actually belongs to the candidate person
 * (or is unassigned), preventing cross-tenant passport attachment/PII leakage.
 */
async function assertPassportBelongsToPerson(
  ctx: MutationCtx,
  passportId: Id<"passports">,
  personId: Id<"people">,
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
  legalFrameworkId: Id<"legalFrameworks">,
): Promise<Doc<"legalFrameworks">> {
  const framework = await ctx.db.get(legalFrameworkId);
  if (!framework || framework.isActive === false || !framework.showInRequest) {
    throw new Error(
      "Access denied: this legal framework is not available for requests",
    );
  }
  return framework;
}

const RESIDENCE_ABROAD_FIELDS = [
  "residenceCountryCode",
  "residenceCountryName",
  "residenceStateCode",
  "residenceCity",
  "residenceSince",
  "residenceAddressAbroad",
  "consularPost",
] as const;

/** Keep the stored receipt destination consistent with the legal framework. */
function applyFrameworkReceiptRule(
  patch: Record<string, unknown>,
  framework: Doc<"legalFrameworks">,
): void {
  const receivedInBrazil = framework.receivedInBrazil === true;
  patch.visaReceiptLocation = receivedInBrazil ? "brazil" : "abroad";

  if (receivedInBrazil) {
    for (const field of RESIDENCE_ABROAD_FIELDS) patch[field] = undefined;
  }
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

async function enrichRequest(
  ctx: QueryCtx,
  process: Doc<"individualProcesses">,
  profile: Doc<"userProfiles">,
  currentCompanyIds: Set<Id<"companies">>,
) {
  const [
    companyApplicant,
    userApplicantCompany,
    person,
    passport,
    processType,
    legalFramework,
    consulateRaw,
  ] = await Promise.all([
    process.companyApplicantId ? ctx.db.get(process.companyApplicantId) : null,
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

  // Per product decision, a linked person's existing PII is DISPLAYED (read-only
  // in the wizard) even for a cross-tenant person, so values are disclosed here.
  // `owned` still drives WRITE gating in create/saveDraft (never disclosed).
  const owned = person
    ? await personOwnedByClient(ctx, profile, person._id, {
        currentCompanyIds,
        person,
      })
    : false;
  const gated = person ? gatePersonPII(person, true) : null;

  return {
    ...process,
    company,
    // Project the person down to the fields request consumers actually use —
    // never spread the whole doc (keeps CPF / phone / address off the wire,
    // which matters now that clients can dedup-link to cross-tenant people).
    person:
      person && gated
        ? {
            _id: person._id,
            fullName: getFullName(person),
            givenNames: person.givenNames,
            middleName: person.middleName,
            surname: person.surname,
            sex: person.sex,
            birthDate: person.birthDate,
            // Whether the caller owns this person (may see/overwrite PII).
            owned,
            // PII: real values only when owned, else null (protected).
            email: gated.email,
            maritalStatus: gated.maritalStatus,
            fatherName: gated.fatherName,
            motherName: gated.motherName,
            // Presence flags (no values disclosed) so the wizard can lock the
            // already-filled fields of a protected cross-tenant person.
            hasEmail: gated.presence.hasEmail,
            hasMaritalStatus: gated.presence.hasMaritalStatus,
            hasFatherName: gated.presence.hasFatherName,
            hasMotherName: gated.presence.hasMotherName,
          }
        : null,
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
  payload: { type: string; title: string; message: string; entityId: string },
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
      v.union(v.literal("draft"), v.literal("solicitado")),
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
            q.eq("requestStatus", "solicitado"),
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
          r.userApplicantCompanyId === args.companyId,
      );
    }

    // Resolve the client's current companies ONCE (ownership gating in
    // enrichRequest reuses it per row; avoids amplifying this list's N+1).
    const currentCompanyIds =
      userProfile.role === "client"
        ? await getClientCurrentCompanyIds(ctx, userProfile)
        : new Set<Id<"companies">>();

    const enriched = await Promise.all(
      results.map((process) =>
        enrichRequest(ctx, process, userProfile, currentCompanyIds),
      ),
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
        "Access denied: You do not have permission to view this request",
      );
    }

    const currentCompanyIds =
      userProfile.role === "client"
        ? await getClientCurrentCompanyIds(ctx, userProfile)
        : new Set<Id<"companies">>();

    return enrichRequest(ctx, process, userProfile, currentCompanyIds);
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
    // Groups this candidate with the rest of a multi-candidate request. Omitted
    // for the first candidate (a new id is minted and returned).
    requestGroupId: v.optional(v.string()),
    // True when this candidate links to a person that already existed (dedup
    // match) — persisted so wizard resume durably shows "Atualizando cadastro".
    linkedExistingPerson: v.optional(v.boolean()),
    ...editableProcessFields,
    ...editablePersonFields,
  },
  handler: async (ctx, args) => {
    const { profile, companyId } = await requireClient(ctx);
    if (!profile.userId) {
      throw new Error("User profile not activated");
    }

    // The candidate must exist; the passport must belong to that person; the
    // legal framework must be offered to clients.
    await assertPersonExists(ctx, args.personId);
    if (args.passportId) {
      await assertPassportBelongsToPerson(ctx, args.passportId, args.personId);
    }
    const framework = args.legalFrameworkId
      ? await assertFrameworkAvailable(ctx, args.legalFrameworkId)
      : null;

    const now = Date.now();

    // Apply person-level fields to the candidate immediately (overwrite only the
    // client's own people; fill-gaps only for cross-tenant dedup links).
    const overwrite = await personOwnedByClient(ctx, profile, args.personId);
    await applyPersonFields(ctx, args.personId, args, now, overwrite);

    const processPatch = buildProcessPatch(args);
    if (framework) applyFrameworkReceiptRule(processPatch, framework);
    const processTypeId = args.legalFrameworkId
      ? await deriveProcessTypeId(ctx, args.legalFrameworkId)
      : undefined;

    // Reuse the supplied group id only if the caller already owns a row in it;
    // otherwise mint a fresh one (prevents injecting a row into another batch).
    let requestGroupId = args.requestGroupId;
    if (requestGroupId) {
      const gid = requestGroupId;
      const groupRows = await ctx.db
        .query("individualProcesses")
        .withIndex("by_requestGroup", (q) => q.eq("requestGroupId", gid))
        .collect();
      if (!groupRows.some((r) => r.requestedBy === profile.userId)) {
        requestGroupId = undefined;
      }
    }
    if (!requestGroupId) requestGroupId = generateRequestGroupId();

    const processId = await ctx.db.insert("individualProcesses", {
      personId: args.personId,
      companyApplicantId: companyId,
      userApplicantCompanyId: companyId,
      processTypeId,
      requestStatus: "draft",
      requestedBy: profile.userId,
      requestGroupId,
      linkedExistingPerson: args.linkedExistingPerson,
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
      details: { requestStatus: "draft", requestGroupId },
    });

    return { processId, requestGroupId };
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
        "This request has already been submitted and can no longer be edited as a draft.",
      );
    }

    const framework = rest.legalFrameworkId
      ? await assertFrameworkAvailable(ctx, rest.legalFrameworkId)
      : process.legalFrameworkId
        ? await ctx.db.get(process.legalFrameworkId)
        : null;
    if (rest.passportId !== undefined) {
      await assertPassportBelongsToPerson(
        ctx,
        rest.passportId,
        process.personId,
      );
    }

    const now = Date.now();

    const overwrite = await personOwnedByClient(
      ctx,
      userProfile,
      process.personId,
    );
    await applyPersonFields(ctx, process.personId, rest, now, overwrite);

    const patch = buildProcessPatch(rest);
    if (framework) applyFrameworkReceiptRule(patch, framework);
    if (rest.legalFrameworkId !== undefined) {
      patch.processTypeId = await deriveProcessTypeId(
        ctx,
        rest.legalFrameworkId,
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
/**
 * Flip ONE draft row to "solicitado" and run every process-creation side effect
 * (status record, document checklists, auto-reuse) + activity log. Shared by the
 * single and batch finalize paths. Does NOT notify admins — callers do that once.
 */
async function finalizeOneDraft(
  ctx: MutationCtx,
  process: Doc<"individualProcesses">,
  userId: Id<"users">,
  now: number,
): Promise<void> {
  const framework = process.legalFrameworkId
    ? await ctx.db.get(process.legalFrameworkId)
    : null;
  const receiptPatch: Record<string, unknown> = {};
  if (framework) applyFrameworkReceiptRule(receiptPatch, framework);

  await ctx.db.patch(process._id, {
    ...receiptPatch,
    requestStatus: "solicitado",
    requestedAt: now,
    updatedAt: now,
  });
  await runProcessCreationSideEffects(ctx, process._id, userId);
  await logActivitySafely(ctx, {
    userId,
    action: "submitted",
    entityType: "processRequest",
    entityId: process._id,
    details: { requestStatus: "solicitado" },
  });
}

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
        `Cannot finalize a request with status "${process.requestStatus}"`,
      );
    }
    if (!process.legalFrameworkId) {
      throw new Error("A legal framework is required before finalizing");
    }

    const now = Date.now();
    await finalizeOneDraft(ctx, process, userProfile.userId, now);

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
 * Finalize EVERY draft candidate in a multi-candidate request batch at once.
 * Each candidate becomes its own live process ("solicitado"); admins are
 * notified a single time for the whole batch.
 */
export const finalizeGroup = mutation({
  args: { requestGroupId: v.string() },
  handler: async (ctx, { requestGroupId }) => {
    const userProfile = await getCurrentUserProfile(ctx);
    if (userProfile.role !== "client") {
      throw new Error("Only the requester can finalize a request");
    }
    if (!userProfile.userId) {
      throw new Error("User profile not activated");
    }
    const userId = userProfile.userId;

    const rows = await ctx.db
      .query("individualProcesses")
      .withIndex("by_requestGroup", (q) =>
        q.eq("requestGroupId", requestGroupId),
      )
      .collect();
    const drafts = rows.filter(
      (r) => r.requestedBy === userId && r.requestStatus === "draft",
    );
    if (drafts.length === 0) {
      throw new Error("No draft candidates to submit in this request");
    }
    for (const draft of drafts) {
      if (!draft.legalFrameworkId) {
        throw new Error("A legal framework is required before submitting");
      }
    }

    const now = Date.now();
    for (const draft of drafts) {
      await finalizeOneDraft(ctx, draft, userId, now);
    }

    const first = drafts[0];
    const company = first.companyApplicantId
      ? await ctx.db.get(first.companyApplicantId)
      : null;
    await notifyAdmins(ctx, {
      type: "process_request_submitted",
      title: "Nova solicitação de processo",
      message: `${company?.name ?? "Uma empresa"} enviou uma solicitação com ${drafts.length} candidato(s).`,
      entityId: first._id,
    });

    return { count: drafts.length, requestGroupId };
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
        "Only draft requests can be deleted here. Finalized requests are deleted from the process list.",
      );
    }

    const messages = await ctx.db
      .query("processRequestMessages")
      .withIndex("by_individualProcess", (q) => q.eq("individualProcessId", id))
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

/**
 * Fetch every candidate row of a multi-candidate request batch, enriched and
 * ordered by creation, to resume the wizard or render the request as one unit.
 * Clients only see their own rows; admins see all rows in the group.
 */
export const getRequestGroup = query({
  args: { requestGroupId: v.string() },
  handler: async (ctx, { requestGroupId }) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const rows = await ctx.db
      .query("individualProcesses")
      .withIndex("by_requestGroup", (q) =>
        q.eq("requestGroupId", requestGroupId),
      )
      .collect();

    const visible =
      userProfile.role === "client"
        ? rows.filter((r) => r.requestedBy === userProfile.userId)
        : rows;

    visible.sort((a, b) => a.createdAt - b.createdAt);
    const currentCompanyIds =
      userProfile.role === "client"
        ? await getClientCurrentCompanyIds(ctx, userProfile)
        : new Set<Id<"companies">>();
    return Promise.all(
      visible.map((process) =>
        enrichRequest(ctx, process, userProfile, currentCompanyIds),
      ),
    );
  },
});

/**
 * Delete an entire draft request batch (client owner or admin) — all draft
 * candidates in the group plus their conversation threads. Only drafts are
 * removed; finalized candidates are live processes deleted via the process list.
 */
export const removeGroup = mutation({
  args: { requestGroupId: v.string() },
  handler: async (ctx, { requestGroupId }) => {
    const userProfile = await getCurrentUserProfile(ctx);
    if (userProfile.role !== "client" && userProfile.role !== "admin") {
      throw new Error("Access denied");
    }

    const rows = await ctx.db
      .query("individualProcesses")
      .withIndex("by_requestGroup", (q) =>
        q.eq("requestGroupId", requestGroupId),
      )
      .collect();

    let count = 0;
    for (const row of rows) {
      if (
        userProfile.role === "client" &&
        row.requestedBy !== userProfile.userId
      ) {
        continue;
      }
      if (row.requestStatus !== "draft") continue;

      const messages = await ctx.db
        .query("processRequestMessages")
        .withIndex("by_individualProcess", (q) =>
          q.eq("individualProcessId", row._id),
        )
        .collect();
      for (const m of messages) await ctx.db.delete(m._id);

      await ctx.db.delete(row._id);
      count++;
    }

    if (count > 0) {
      await logActivitySafely(ctx, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "processRequest",
        entityId: requestGroupId,
        details: { requestStatus: "draft", count },
      });
    }

    return { count };
  },
});

/**
 * Ensure a draft row belongs to a request group, minting one if absent. Used
 * when resuming a LEGACY single draft (created before request groups existed) so
 * that any candidates added afterwards join the SAME group and finalize together
 * — without this, the original row would be orphaned and never submitted.
 */
export const ensureRequestGroup = mutation({
  args: { id: v.id("individualProcesses") },
  handler: async (ctx, { id }) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const process = await ctx.db.get(id);
    if (!process) throw new Error("Process request not found");

    if (
      userProfile.role === "client" &&
      process.requestedBy !== userProfile.userId
    ) {
      throw new Error("Access denied: This is not your request");
    }
    if (userProfile.role !== "client" && userProfile.role !== "admin") {
      throw new Error("Access denied");
    }

    if (process.requestGroupId) return process.requestGroupId;

    const requestGroupId = generateRequestGroupId();
    await ctx.db.patch(id, { requestGroupId, updatedAt: Date.now() });
    return requestGroupId;
  },
});
