import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getCurrentUserProfile, requireAdmin, requireClient } from "./lib/auth";
import { logActivitySafely } from "./lib/activityLogger";
import {
  createIndividualProcessCore,
  CreateIndividualProcessInput,
} from "./lib/createIndividualProcess";

function getFullName(person: {
  givenNames: string;
  middleName?: string;
  surname?: string;
}): string {
  return [person.givenNames, person.middleName, person.surname]
    .filter(Boolean)
    .join(" ");
}

/**
 * The set of request fields a client/admin can edit while the request is a draft.
 * Shared between `createDraft` and `saveDraft` to avoid drift.
 */
const editableRequestFields = {
  // Candidate (created/linked at the passport step)
  candidatePersonId: v.optional(v.id("people")),
  candidatePassportId: v.optional(v.id("passports")),
  passportStorageId: v.optional(v.id("_storage")),
  candidateEmail: v.optional(v.string()),
  maritalStatus: v.optional(v.string()),
  fatherName: v.optional(v.string()),
  motherName: v.optional(v.string()),
  // Process-level draft fields
  processTypeId: v.optional(v.id("processTypes")),
  legalFrameworkId: v.optional(v.id("legalFrameworks")),
  workplaceCityId: v.optional(v.id("cities")),
  consulateId: v.optional(v.id("consulates")),
  isUrgent: v.optional(v.boolean()),
  requestDate: v.optional(v.string()),
  notes: v.optional(v.string()),
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

type EditableArgs = Partial<Record<keyof typeof editableRequestFields, unknown>>;

function buildEditablePatch(args: EditableArgs): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(editableRequestFields)) {
    const value = (args as Record<string, unknown>)[key];
    if (value !== undefined) patch[key] = value;
  }
  return patch;
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

async function enrichRequest(ctx: QueryCtx, request: Doc<"processRequests">) {
  const [
    company,
    candidatePerson,
    candidatePassport,
    processType,
    legalFramework,
    workplaceCity,
    consulateRaw,
    reviewer,
    approvedIndividualProcess,
  ] = await Promise.all([
    ctx.db.get(request.companyId),
    request.candidatePersonId ? ctx.db.get(request.candidatePersonId) : null,
    request.candidatePassportId ? ctx.db.get(request.candidatePassportId) : null,
    request.processTypeId ? ctx.db.get(request.processTypeId) : null,
    request.legalFrameworkId ? ctx.db.get(request.legalFrameworkId) : null,
    request.workplaceCityId ? ctx.db.get(request.workplaceCityId) : null,
    request.consulateId ? ctx.db.get(request.consulateId) : null,
    request.reviewedBy ? ctx.db.get(request.reviewedBy) : null,
    request.approvedIndividualProcessId
      ? ctx.db.get(request.approvedIndividualProcessId)
      : null,
  ]);

  let consulate = null;
  if (consulateRaw) {
    const consulateCity = consulateRaw.cityId
      ? await ctx.db.get(consulateRaw.cityId)
      : null;
    consulate = { ...consulateRaw, city: consulateCity };
  }

  let reviewerProfile = null;
  if (reviewer) {
    reviewerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", reviewer._id))
      .first();
  }

  const creatorProfile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", request.createdBy))
    .first();

  return {
    ...request,
    company,
    candidatePerson: candidatePerson
      ? { ...candidatePerson, fullName: getFullName(candidatePerson) }
      : null,
    candidatePassport,
    processType,
    legalFramework,
    workplaceCity,
    consulate,
    reviewerProfile,
    creatorProfile,
    approvedIndividualProcess,
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

async function notifyUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  payload: { type: string; title: string; message: string; entityId: string }
) {
  await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    entityType: "processRequest",
    entityId: payload.entityId,
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * List process requests.
 * - Admins see all requests (optionally filtered by status / company).
 * - Clients see only the requests they created (scoped to their current company).
 */
export const list = query({
  args: {
    status: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    let results: Doc<"processRequests">[];

    if (userProfile.role === "client") {
      // Clients only see their own requests.
      const userId = userProfile.userId;
      if (!userId) return [];
      results = await ctx.db
        .query("processRequests")
        .withIndex("by_createdBy", (q) => q.eq("createdBy", userId))
        .collect();
    } else if (args.companyId !== undefined) {
      const companyId = args.companyId;
      results = await ctx.db
        .query("processRequests")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect();
    } else if (args.status !== undefined) {
      const status = args.status;
      results = await ctx.db
        .query("processRequests")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      results = await ctx.db.query("processRequests").collect();
    }

    if (args.status !== undefined) {
      results = results.filter((r) => r.status === args.status);
    }

    const enriched = await Promise.all(
      results.map((request) => enrichRequest(ctx, request))
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Get a single process request, enriched, with its version history.
 * Clients may only access their own requests.
 */
export const get = query({
  args: { id: v.id("processRequests") },
  handler: async (ctx, { id }) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const request = await ctx.db.get(id);
    if (!request) return null;

    if (userProfile.role === "client" && request.createdBy !== userProfile.userId) {
      throw new Error(
        "Access denied: You do not have permission to view this request"
      );
    }

    const enriched = await enrichRequest(ctx, request);

    const versions = await ctx.db
      .query("processRequestVersions")
      .withIndex("by_processRequest", (q) => q.eq("processRequestId", id))
      .collect();

    return {
      ...enriched,
      versions: versions.sort((a, b) => b.version - a.version),
    };
  },
});

// ---------------------------------------------------------------------------
// Draft lifecycle (client)
// ---------------------------------------------------------------------------

/**
 * Create a new draft process request (client only). Registered under the
 * client's CURRENT company. Optionally seeded with initial fields (e.g. the
 * candidate created at the passport step).
 */
export const createDraft = mutation({
  args: editableRequestFields,
  handler: async (ctx, args) => {
    const { profile, companyId } = await requireClient(ctx);
    if (!profile.userId) {
      throw new Error("User profile not activated");
    }

    const now = Date.now();
    const patch = buildEditablePatch(args);

    const requestId = await ctx.db.insert("processRequests", {
      companyId,
      createdBy: profile.userId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      ...patch,
    });

    await logActivitySafely(ctx, {
      userId: profile.userId,
      action: "created",
      entityType: "processRequest",
      entityId: requestId,
      details: { status: "draft" },
    });

    return requestId;
  },
});

/**
 * Save changes to a draft request.
 * - Client owner: only while status is "draft".
 * - Admin: while status is "draft" or "submitted".
 */
export const saveDraft = mutation({
  args: { id: v.id("processRequests"), ...editableRequestFields },
  handler: async (ctx, { id, ...rest }) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const request = await ctx.db.get(id);
    if (!request) throw new Error("Process request not found");

    if (userProfile.role === "client") {
      if (request.createdBy !== userProfile.userId) {
        throw new Error("Access denied: This is not your request");
      }
      if (request.status !== "draft") {
        throw new Error(
          "This request has been submitted and is locked. Ask an admin to reopen it for editing."
        );
      }
    } else {
      // admin
      if (request.status !== "draft" && request.status !== "submitted") {
        throw new Error(
          `Cannot edit a request with status "${request.status}"`
        );
      }
    }

    const patch = buildEditablePatch(rest);
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });

    return id;
  },
});

/**
 * Submit a draft request for admin review (client owner only).
 * Locks the request for the client, increments the version, and writes an
 * immutable snapshot to processRequestVersions.
 */
export const submit = mutation({
  args: { id: v.id("processRequests") },
  handler: async (ctx, { id }) => {
    const userProfile = await getCurrentUserProfile(ctx);
    if (userProfile.role !== "client") {
      throw new Error("Only the requester can submit a request");
    }

    const request = await ctx.db.get(id);
    if (!request) throw new Error("Process request not found");
    if (request.createdBy !== userProfile.userId) {
      throw new Error("Access denied: This is not your request");
    }
    if (request.status !== "draft") {
      throw new Error(`Cannot submit a request with status "${request.status}"`);
    }
    if (!request.candidatePersonId) {
      throw new Error(
        "A candidate passport must be uploaded before submitting the request"
      );
    }

    const now = Date.now();
    const nextVersion = (request.version ?? 0) + 1;

    // Immutable snapshot of the request fields at submission time.
    const { _id, _creationTime, ...snapshot } = request;
    await ctx.db.insert("processRequestVersions", {
      processRequestId: id,
      version: nextVersion,
      snapshot: { ...snapshot, version: nextVersion, status: "submitted" },
      submittedBy: userProfile.userId!,
      submittedAt: now,
    });

    await ctx.db.patch(id, {
      status: "submitted",
      version: nextVersion,
      submittedAt: now,
      updatedAt: now,
    });

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "submitted",
      entityType: "processRequest",
      entityId: id,
      details: { version: nextVersion },
    });

    const company = await ctx.db.get(request.companyId);
    await notifyAdmins(ctx, {
      type: "process_request_submitted",
      title: "Nova solicitação de processo",
      message: `${company?.name ?? "Uma empresa"} enviou a solicitação v${nextVersion} para análise.`,
      entityId: id,
    });

    return id;
  },
});

// ---------------------------------------------------------------------------
// Review lifecycle (admin)
// ---------------------------------------------------------------------------

/**
 * Reopen a submitted/rejected request so the client can edit it again (admin only).
 */
export const reopen = mutation({
  args: { id: v.id("processRequests") },
  handler: async (ctx, { id }) => {
    const adminProfile = await requireAdmin(ctx);

    const request = await ctx.db.get(id);
    if (!request) throw new Error("Process request not found");

    if (request.status !== "submitted" && request.status !== "rejected") {
      throw new Error(
        `Cannot reopen a request with status "${request.status}"`
      );
    }

    const now = Date.now();
    await ctx.db.patch(id, { status: "draft", updatedAt: now });

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "reopened",
      entityType: "processRequest",
      entityId: id,
      details: { previousStatus: request.status },
    });

    await notifyUser(ctx, request.createdBy, {
      type: "process_request_reopened",
      title: "Solicitação liberada para edição",
      message:
        "O administrador liberou sua solicitação para edição. Faça os ajustes e envie novamente.",
      entityId: id,
    });

    return id;
  },
});

/**
 * Approve a submitted request: create a fully pre-filled individual process,
 * apply candidate person-level fields, and mark the request approved (admin only).
 */
export const approve = mutation({
  args: { id: v.id("processRequests") },
  handler: async (ctx, { id }) => {
    const adminProfile = await requireAdmin(ctx);
    if (!adminProfile.userId) throw new Error("Admin profile not activated");

    const request = await ctx.db.get(id);
    if (!request) throw new Error("Process request not found");
    if (request.status !== "submitted") {
      throw new Error(
        `Cannot approve a request with status "${request.status}" (must be submitted)`
      );
    }
    if (!request.candidatePersonId) {
      throw new Error("Request has no candidate person to convert");
    }

    const now = Date.now();

    // Apply candidate person-level draft fields to the person record.
    const personPatch: Record<string, unknown> = {};
    if (request.candidateEmail) personPatch.email = request.candidateEmail;
    if (request.maritalStatus) personPatch.maritalStatus = request.maritalStatus;
    if (request.fatherName) personPatch.fatherName = request.fatherName;
    if (request.motherName) personPatch.motherName = request.motherName;
    if (Object.keys(personPatch).length > 0) {
      personPatch.updatedAt = now;
      await ctx.db.patch(request.candidatePersonId, personPatch);
    }

    // Build the individual-process input from the request.
    const input: CreateIndividualProcessInput = {
      personId: request.candidatePersonId,
      passportId: request.candidatePassportId,
      companyApplicantId: request.companyId, // requester company -> company applicant (client visibility + doc reuse)
      userApplicantCompanyId: request.companyId,
      consulateId: request.consulateId,
      processTypeId: request.processTypeId,
      legalFrameworkId: request.legalFrameworkId,
      dateProcess: request.requestDate,
      urgent: request.isUrgent,
      lastSalaryCurrency: request.lastSalaryCurrency,
      lastSalaryAmount: request.lastSalaryAmount,
      exchangeRateToBRL: request.exchangeRateToBRL,
      salaryInBRL: request.salaryInBRL,
      monthlyAmountToReceive: request.monthlyAmountToReceive,
      visaReceiptLocation: request.visaReceiptLocation,
      residenceCountryCode: request.residenceCountryCode,
      residenceCountryName: request.residenceCountryName,
      residenceStateCode: request.residenceStateCode,
      residenceCity: request.residenceCity,
      residenceSince: request.residenceSince,
      residenceAddressAbroad: request.residenceAddressAbroad,
      consularPost: request.consularPost,
      professionalExperience: request.professionalExperience,
    };

    const processId = await createIndividualProcessCore(
      ctx,
      input,
      adminProfile.userId
    );

    await ctx.db.patch(id, {
      status: "approved",
      reviewedBy: adminProfile.userId,
      reviewedAt: now,
      approvedIndividualProcessId: processId,
      updatedAt: now,
    });

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "approved",
      entityType: "processRequest",
      entityId: id,
      details: {
        previousStatus: request.status,
        newStatus: "approved",
        approvedIndividualProcessId: processId,
      },
    });

    await notifyUser(ctx, request.createdBy, {
      type: "process_request_approved",
      title: "Solicitação aprovada",
      message:
        "Sua solicitação foi aprovada e convertida em um processo individual.",
      entityId: id,
    });

    return processId;
  },
});

/**
 * Reject a submitted request (admin only). The conversation stays open.
 */
export const reject = mutation({
  args: { id: v.id("processRequests"), rejectionReason: v.string() },
  handler: async (ctx, { id, rejectionReason }) => {
    const adminProfile = await requireAdmin(ctx);

    const request = await ctx.db.get(id);
    if (!request) throw new Error("Process request not found");
    if (request.status !== "submitted") {
      throw new Error(
        `Cannot reject a request with status "${request.status}" (must be submitted)`
      );
    }
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error("Rejection reason is required");
    }

    const now = Date.now();
    await ctx.db.patch(id, {
      status: "rejected",
      reviewedBy: adminProfile.userId,
      reviewedAt: now,
      rejectionReason,
      updatedAt: now,
    });

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "rejected",
      entityType: "processRequest",
      entityId: id,
      details: { previousStatus: request.status, newStatus: "rejected", rejectionReason },
    });

    await notifyUser(ctx, request.createdBy, {
      type: "process_request_rejected",
      title: "Solicitação rejeitada",
      message: `Sua solicitação foi rejeitada. Motivo: ${rejectionReason}`,
      entityId: id,
    });

    return id;
  },
});

/**
 * Delete a request (admin only). Approved requests that created a process
 * cannot be deleted.
 */
export const remove = mutation({
  args: { id: v.id("processRequests") },
  handler: async (ctx, { id }) => {
    const adminProfile = await requireAdmin(ctx);

    const request = await ctx.db.get(id);
    if (!request) throw new Error("Process request not found");

    if (request.status === "approved" && request.approvedIndividualProcessId) {
      throw new Error(
        "Cannot delete an approved request that created a process. Delete the process first."
      );
    }

    // Clean up conversation + version history.
    const [messages, versions] = await Promise.all([
      ctx.db
        .query("processRequestMessages")
        .withIndex("by_processRequest", (q) => q.eq("processRequestId", id))
        .collect(),
      ctx.db
        .query("processRequestVersions")
        .withIndex("by_processRequest", (q) => q.eq("processRequestId", id))
        .collect(),
    ]);
    for (const m of messages) await ctx.db.delete(m._id);
    for (const ver of versions) await ctx.db.delete(ver._id);

    await ctx.db.delete(id);

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "deleted",
      entityType: "processRequest",
      entityId: id,
      details: { status: request.status },
    });

    return id;
  },
});
