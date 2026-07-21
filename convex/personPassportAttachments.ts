import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  getClientCurrentCompanyIds,
  getCurrentUserProfile,
  requireAdmin,
} from "./lib/auth";
import { logActivitySafely } from "./lib/activityLogger";
import {
  normalizePersonPassportFileName,
  validatePersonPassportUpload,
} from "./lib/personPassportAttachment";

const attachmentValidator = v.object({
  _id: v.id("personPassportAttachments"),
  personId: v.id("people"),
  storageId: v.id("_storage"),
  fileName: v.string(),
  mimeType: v.string(),
  fileSize: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  url: v.union(v.string(), v.null()),
});

type AttachmentCtx = QueryCtx | MutationCtx;

async function requirePersonReadAccess(
  ctx: AttachmentCtx,
  personId: Id<"people">,
) {
  const profile = await getCurrentUserProfile(ctx);
  const person = await ctx.db.get(personId);
  if (!person) throw new Error("Person not found");

  if (profile.role === "admin") return person;

  if (profile.role !== "client") {
    throw new Error("Access denied");
  }

  const currentCompanyIds = await getClientCurrentCompanyIds(ctx, profile);
  const links = await ctx.db
    .query("peopleCompanies")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  const canRead = links.some(
    (link) =>
      link.isCurrent &&
      link.companyId !== undefined &&
      currentCompanyIds.has(link.companyId),
  );

  if (!canRead) {
    throw new Error(
      "Access denied: You do not have permission to view this person",
    );
  }

  return person;
}

/** Return the single registration-source passport attached to a person. */
export const getByPerson = query({
  args: { personId: v.id("people") },
  returns: v.union(attachmentValidator, v.null()),
  handler: async (ctx, { personId }) => {
    await requirePersonReadAccess(ctx, personId);

    const attachment = await ctx.db
      .query("personPassportAttachments")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .first();
    if (!attachment) return null;

    return {
      _id: attachment._id,
      personId: attachment.personId,
      storageId: attachment.storageId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
      url: await ctx.storage.getUrl(attachment.storageId),
    };
  },
});

/** Replace only the person's registration-source passport attachment. */
export const replace = mutation({
  args: {
    personId: v.id("people"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  returns: v.id("personPassportAttachments"),
  handler: async (ctx, args) => {
    const adminProfile = await requireAdmin(ctx);
    const person = await ctx.db.get(args.personId);
    if (!person) throw new Error("Person not found");

    const fileName = normalizePersonPassportFileName(args.fileName);
    const { mimeType, fileSize } = await validatePersonPassportUpload(
      ctx,
      args.storageId,
    );
    const existing = await ctx.db
      .query("personPassportAttachments")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .first();
    const storageOwner = await ctx.db
      .query("personPassportAttachments")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
    if (storageOwner && storageOwner.personId !== args.personId) {
      throw new Error("Uploaded passport is already attached to another person");
    }
    const now = Date.now();

    let attachmentId: Id<"personPassportAttachments">;
    if (existing) {
      attachmentId = existing._id;
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        fileName,
        mimeType,
        fileSize,
        updatedAt: now,
      });
      if (existing.storageId !== args.storageId) {
        await ctx.storage.delete(existing.storageId);
      }
    } else {
      if (!adminProfile.userId) {
        throw new Error("Administrator profile is not activated");
      }
      attachmentId = await ctx.db.insert("personPassportAttachments", {
        personId: args.personId,
        storageId: args.storageId,
        fileName,
        mimeType,
        fileSize,
        createdAt: now,
        updatedAt: now,
        createdBy: adminProfile.userId,
      });
    }

    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: existing ? "updated" : "created",
      entityType: "personPassportAttachment",
      entityId: attachmentId,
      details: {
        personId: args.personId,
        fileName,
        replacedFileName: existing?.fileName,
      },
    });

    return attachmentId;
  },
});

/** Remove only the person's registration-source passport attachment. */
export const remove = mutation({
  args: { personId: v.id("people") },
  returns: v.null(),
  handler: async (ctx, { personId }) => {
    const adminProfile = await requireAdmin(ctx);
    const person = await ctx.db.get(personId);
    if (!person) throw new Error("Person not found");

    const attachment = await ctx.db
      .query("personPassportAttachments")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .first();
    if (!attachment) return null;

    await ctx.db.delete(attachment._id);
    await ctx.storage.delete(attachment.storageId);
    await logActivitySafely(ctx, {
      userId: adminProfile.userId,
      action: "deleted",
      entityType: "personPassportAttachment",
      entityId: attachment._id,
      details: { personId, fileName: attachment.fileName },
    });
    return null;
  },
});

/** Delete a temporary upload only when it is not linked as a person attachment. */
export const discardUnlinkedUpload = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.boolean(),
  handler: async (ctx, { storageId }) => {
    await requireAdmin(ctx);
    const linked = await ctx.db
      .query("personPassportAttachments")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .first();
    if (linked) return false;

    const verification = await ctx.db
      .query("personPassportOcrVerifications")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .first();
    if (verification) {
      await ctx.db.delete(verification._id);
    }

    const metadata = await ctx.db.system.get(storageId);
    if (!metadata) return verification !== null;
    await ctx.storage.delete(storageId);
    return true;
  },
});
