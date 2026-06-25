import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { runProcessCreationSideEffects } from "../lib/createIndividualProcess";

/**
 * One-time migration: fold the deprecated `processRequests` table into
 * `individualProcesses`.
 *
 * For each processRequests row:
 *  - ALREADY CONVERTED (has approvedIndividualProcessId OR the legacy
 *    approvedCollectiveProcessId): backfill the request-lifecycle fields onto the
 *    existing process row(s) (requestStatus="solicitado"). The process already
 *    exists with all its side effects — do NOT re-run them. If the target can't
 *    be resolved (anomaly), the orphaned request + its children are discarded
 *    and logged (never duplicated; guarantees the batch makes progress).
 *  - DRAFT: create a new individualProcesses row with requestStatus="draft" and
 *    NO side effects (it is still in-progress).
 *  - SUBMITTED / PENDING (legacy): create a live process (requestStatus=
 *    "solicitado") and run the creation side effects (status, checklists, ...).
 *  - REJECTED: create a "draft" row (kept editable); the rejection reason is
 *    preserved into requestNotes.
 *
 * Person-level fields (candidateEmail / maritalStatus / fatherName / motherName)
 * are applied to the candidate's `people` record. The conversation thread is
 * re-pointed to the new/target individualProcesses row. Rows without a candidate
 * person are skipped (cannot satisfy the required personId).
 *
 * Processes up to BATCH rows per invocation (deletes the source rows it handles,
 * so it is safe to re-run until `hasMore` is false). This keeps each mutation
 * within Convex read/write limits even on a large table.
 *
 * Run with (re-run until hasMore=false):
 *   pnpm dlx convex run migrations/mergeProcessRequestsIntoIndividualProcesses:run
 *   pnpm dlx convex run --prod migrations/mergeProcessRequestsIntoIndividualProcesses:run
 */
const BATCH = 50;

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("processRequests").take(BATCH);

    let backfilled = 0;
    let createdDrafts = 0;
    let createdSolicitados = 0;
    let skippedNoCandidate = 0;
    let skippedUnresolvedTarget = 0;
    let messagesRepointed = 0;
    let versionsDeleted = 0;

    const now = Date.now();

    // Re-point this request's conversation to a target process, and drop its
    // (obsolete) version snapshots.
    const repointChildren = async (
      requestId: Id<"processRequests">,
      targetId: Id<"individualProcesses">
    ) => {
      const messages = await ctx.db
        .query("processRequestMessages")
        .withIndex("by_processRequest", (q) =>
          q.eq("processRequestId", requestId)
        )
        .collect();
      for (const m of messages) {
        await ctx.db.patch(m._id, {
          individualProcessId: targetId,
          processRequestId: undefined,
        });
        messagesRepointed++;
      }
      const versions = await ctx.db
        .query("processRequestVersions")
        .withIndex("by_processRequest", (q) =>
          q.eq("processRequestId", requestId)
        )
        .collect();
      for (const ver of versions) {
        await ctx.db.delete(ver._id);
        versionsDeleted++;
      }
    };

    // Delete a request's version snapshots (when there is no target process).
    const dropVersions = async (requestId: Id<"processRequests">) => {
      const versions = await ctx.db
        .query("processRequestVersions")
        .withIndex("by_processRequest", (q) =>
          q.eq("processRequestId", requestId)
        )
        .collect();
      for (const ver of versions) {
        await ctx.db.delete(ver._id);
        versionsDeleted++;
      }
    };

    // Discard an unresolvable/orphaned request: delete its conversation + version
    // snapshots (nowhere to re-point them) and the request itself. Always makes
    // progress so the batched run is guaranteed to terminate.
    const discardOrphanRequest = async (requestId: Id<"processRequests">) => {
      const messages = await ctx.db
        .query("processRequestMessages")
        .withIndex("by_processRequest", (q) =>
          q.eq("processRequestId", requestId)
        )
        .collect();
      for (const m of messages) await ctx.db.delete(m._id);
      await dropVersions(requestId);
      await ctx.db.delete(requestId);
    };

    for (const request of requests) {
      // ----- Apply person-level draft fields to the candidate ------------------
      const applyPersonFields = async (personId: Id<"people">) => {
        const patch: Record<string, unknown> = {};
        if (request.candidateEmail) patch.email = request.candidateEmail;
        if (request.maritalStatus) patch.maritalStatus = request.maritalStatus;
        if (request.fatherName) patch.fatherName = request.fatherName;
        if (request.motherName) patch.motherName = request.motherName;
        if (Object.keys(patch).length > 0) {
          patch.updatedAt = now;
          await ctx.db.patch(personId, patch);
        }
      };

      // ===== ALREADY CONVERTED: backfill onto the existing process row =========
      // Approved requests created a process via the individual path OR the
      // legacy collective path. Resolve the target individualProcess.
      let targetProcessId: Id<"individualProcesses"> | null =
        request.approvedIndividualProcessId ?? null;

      if (
        !targetProcessId &&
        (request.status === "approved" || request.approvedCollectiveProcessId)
      ) {
        // Legacy collective-approval path: find the individual process linked to
        // that collective for this candidate (best effort).
        if (request.approvedCollectiveProcessId && request.candidatePersonId) {
          const linked = await ctx.db
            .query("individualProcesses")
            .withIndex("by_collectiveProcess", (q) =>
              q.eq("collectiveProcessId", request.approvedCollectiveProcessId!)
            )
            .collect();
          const match = linked.find(
            (p) => p.personId === request.candidatePersonId
          );
          targetProcessId = match?._id ?? null;
        }

        if (!targetProcessId) {
          // Approved but we cannot resolve the live process (anomaly). Do NOT
          // create a duplicate draft — discard the orphaned request + children
          // and log it (guarantees progress/termination).
          console.warn(
            `Discarding approved request ${request._id}: could not resolve target individual process`
          );
          await discardOrphanRequest(request._id);
          skippedUnresolvedTarget++;
          continue;
        }
      }

      if (targetProcessId) {
        const target = await ctx.db.get(targetProcessId);
        if (!target) {
          // Dangling approved link (target process deleted): discard the
          // orphaned request + children and log it (no dangling FKs, and the
          // batch keeps making progress).
          console.warn(
            `Discarding request ${request._id}: approved target ${targetProcessId} no longer exists`
          );
          await discardOrphanRequest(request._id);
          skippedUnresolvedTarget++;
          continue;
        }
        await ctx.db.patch(target._id, {
          requestStatus: "solicitado",
          requestedBy: request.createdBy,
          requestedAt:
            request.reviewedAt ?? request.submittedAt ?? request.createdAt,
          requestNotes: request.notes ?? target.requestNotes,
          updatedAt: now,
        });
        await repointChildren(request._id, target._id);
        await ctx.db.delete(request._id);
        backfilled++;
        continue;
      }

      // ===== No process yet: create one =======================================
      if (!request.candidatePersonId) {
        // Cannot create a process without a candidate person — discard the
        // empty request and all its children (messages + version snapshots).
        await discardOrphanRequest(request._id);
        skippedNoCandidate++;
        continue;
      }

      // Resolve the authorization type: prefer the request's own, else derive
      // from the legal framework.
      let processTypeId = request.processTypeId;
      if (!processTypeId && request.legalFrameworkId) {
        const link = await ctx.db
          .query("processTypesLegalFrameworks")
          .withIndex("by_legalFramework", (q) =>
            q.eq("legalFrameworkId", request.legalFrameworkId!)
          )
          .first();
        processTypeId = link?.processTypeId;
      }

      // Map the lifecycle status to the new model.
      const requestStatus: "draft" | "solicitado" =
        request.status === "submitted" || request.status === "pending"
          ? "solicitado"
          : "draft"; // "draft" and (edge) "rejected" stay editable drafts

      // Preserve a rejection reason (the rejected status is gone) into the note.
      const requestNotes =
        request.status === "rejected" && request.rejectionReason
          ? [request.notes, `Rejeitada anteriormente: ${request.rejectionReason}`]
              .filter(Boolean)
              .join("\n\n")
          : request.notes;

      await applyPersonFields(request.candidatePersonId);

      const newProcessId = await ctx.db.insert("individualProcesses", {
        personId: request.candidatePersonId,
        passportId: request.candidatePassportId,
        companyApplicantId: request.companyId,
        userApplicantCompanyId: request.companyId,
        processTypeId,
        legalFrameworkId: request.legalFrameworkId,
        consulateId: request.consulateId,
        urgent: request.isUrgent,
        dateProcess: request.requestDate,
        requestNotes,
        // Salary block
        lastSalaryCurrency: request.lastSalaryCurrency,
        lastSalaryAmount: request.lastSalaryAmount,
        exchangeRateToBRL: request.exchangeRateToBRL,
        salaryInBRL: request.salaryInBRL,
        monthlyAmountToReceive: request.monthlyAmountToReceive,
        // Visa receipt + foreign residence
        visaReceiptLocation: request.visaReceiptLocation,
        residenceCountryCode: request.residenceCountryCode,
        residenceCountryName: request.residenceCountryName,
        residenceStateCode: request.residenceStateCode,
        residenceCity: request.residenceCity,
        residenceSince: request.residenceSince,
        residenceAddressAbroad: request.residenceAddressAbroad,
        consularPost: request.consularPost,
        professionalExperience: request.professionalExperience,
        // Request lifecycle
        requestStatus,
        requestedBy: request.createdBy,
        requestedAt:
          requestStatus === "solicitado"
            ? (request.submittedAt ?? request.createdAt)
            : undefined,
        isActive: true,
        processStatus: "Atual",
        createdAt: request.createdAt,
        updatedAt: now,
      });

      await repointChildren(request._id, newProcessId);

      if (requestStatus === "solicitado") {
        // Becomes a live process: status record, checklists, auto-reuse, log.
        await runProcessCreationSideEffects(ctx, newProcessId, request.createdBy);
        createdSolicitados++;
      } else {
        createdDrafts++;
      }

      await ctx.db.delete(request._id);
    }

    const hasMore = requests.length === BATCH;
    const summary = {
      processedThisBatch: requests.length,
      backfilled,
      createdDrafts,
      createdSolicitados,
      skippedNoCandidate,
      skippedUnresolvedTarget,
      messagesRepointed,
      versionsDeleted,
      hasMore,
    };
    console.log("Process-request merge batch complete:", JSON.stringify(summary));
    return summary;
  },
});
