import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getCurrentUserProfile } from "./lib/auth";

/**
 * Ensure the current user can access the given request.
 * Admins always can; clients only for requests they created.
 */
async function requireRequestAccess(
  ctx: QueryCtx | MutationCtx,
  requestId: Id<"processRequests">
): Promise<{ request: Doc<"processRequests">; profile: Doc<"userProfiles"> }> {
  const profile = await getCurrentUserProfile(ctx);
  const request = await ctx.db.get(requestId);
  if (!request) throw new Error("Process request not found");

  if (profile.role === "client" && request.createdBy !== profile.userId) {
    throw new Error("Access denied: This is not your request");
  }
  return { request, profile };
}

/**
 * List the conversation for a request.
 * - Admins see everything (shared messages + internal observations).
 * - Clients see only shared, non-internal, non-deleted messages.
 */
export const list = query({
  args: { processRequestId: v.id("processRequests") },
  handler: async (ctx, { processRequestId }) => {
    const { profile } = await requireRequestAccess(ctx, processRequestId);

    const messages = await ctx.db
      .query("processRequestMessages")
      .withIndex("by_processRequest_createdAt", (q) =>
        q.eq("processRequestId", processRequestId)
      )
      .collect();

    const visible = messages.filter((m) => {
      if (!m.isActive) return false;
      if (profile.role === "client" && m.isInternal) return false;
      return true;
    });

    return Promise.all(
      visible.map(async (m) => {
        const authorProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", m.authorUserId))
          .first();
        return {
          ...m,
          authorName: authorProfile?.fullName ?? "—",
          authorEmail: authorProfile?.email ?? null,
        };
      })
    );
  },
});

/**
 * Post a message or (admin-only) internal observation to a request.
 */
export const post = mutation({
  args: {
    processRequestId: v.id("processRequests"),
    body: v.string(),
    kind: v.optional(v.union(v.literal("message"), v.literal("observation"))),
  },
  handler: async (ctx, { processRequestId, body, kind }) => {
    const { request, profile } = await requireRequestAccess(
      ctx,
      processRequestId
    );
    if (!profile.userId) throw new Error("User profile not activated");

    const trimmed = body.trim();
    if (!trimmed) throw new Error("Message cannot be empty");

    const resolvedKind = kind ?? "message";
    // Observations are admin-only and always internal/private.
    if (resolvedKind === "observation" && profile.role !== "admin") {
      throw new Error("Only admins can post observations");
    }
    const isInternal = resolvedKind === "observation";

    const now = Date.now();
    const messageId = await ctx.db.insert("processRequestMessages", {
      processRequestId,
      authorUserId: profile.userId,
      authorRole: profile.role === "admin" ? "admin" : "client",
      kind: resolvedKind,
      isInternal,
      body: trimmed,
      isActive: true,
      createdAt: now,
    });

    // Notifications (skip for private observations).
    if (!isInternal) {
      if (profile.role === "client") {
        // Notify all admins.
        const admins = await ctx.db
          .query("userProfiles")
          .withIndex("by_role", (q) => q.eq("role", "admin"))
          .collect();
        for (const admin of admins) {
          if (!admin.userId || !admin.isActive) continue;
          await ctx.scheduler.runAfter(
            0,
            internal.notifications.createNotification,
            {
              userId: admin.userId,
              type: "process_request_message",
              title: "Nova mensagem na solicitação",
              message: trimmed.slice(0, 140),
              entityType: "processRequest",
              entityId: processRequestId,
            }
          );
        }
      } else {
        // Admin -> notify the requester.
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.createNotification,
          {
            userId: request.createdBy,
            type: "process_request_message",
            title: "Nova mensagem do administrador",
            message: trimmed.slice(0, 140),
            entityType: "processRequest",
            entityId: processRequestId,
          }
        );
      }
    }

    return messageId;
  },
});

/**
 * Soft-delete a message (author or any admin).
 */
export const remove = mutation({
  args: { id: v.id("processRequestMessages") },
  handler: async (ctx, { id }) => {
    const profile = await getCurrentUserProfile(ctx);
    const message = await ctx.db.get(id);
    if (!message) throw new Error("Message not found");

    if (profile.role !== "admin" && message.authorUserId !== profile.userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(id, { isActive: false, editedAt: Date.now() });
    return id;
  },
});
