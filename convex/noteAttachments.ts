import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const NOTE_ATTACHMENT_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

const attachmentValidator = v.object({
  _id: v.id("noteAttachments"),
  noteId: v.id("notes"),
  storageId: v.id("_storage"),
  fileName: v.string(),
  mimeType: v.string(),
  fileSize: v.number(),
  uploadedBy: v.id("users"),
  uploadedAt: v.number(),
  url: v.union(v.string(), v.null()),
});

function normalizeFileName(fileName: string): string {
  const normalized = fileName.trim();
  if (!normalized) throw new Error("File name is required");
  if (normalized.length > 255) throw new Error("File name is too long");
  return normalized;
}

export const list = query({
  args: { noteId: v.id("notes") },
  returns: v.array(attachmentValidator),
  handler: async (ctx, { noteId }) => {
    await requireAdmin(ctx);
    const note = await ctx.db.get(noteId);
    if (!note || !note.isActive) throw new Error("Note not found");

    const attachments = await ctx.db
      .query("noteAttachments")
      .withIndex("by_note", (q) => q.eq("noteId", noteId))
      .collect();

    return await Promise.all(
      attachments
        .sort((a, b) => b.uploadedAt - a.uploadedAt)
        .map(async (attachment) => ({
          _id: attachment._id,
          noteId: attachment.noteId,
          storageId: attachment.storageId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          uploadedBy: attachment.uploadedBy,
          uploadedAt: attachment.uploadedAt,
          url: await ctx.storage.getUrl(attachment.storageId),
        })),
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attach = mutation({
  args: {
    noteId: v.id("notes"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  returns: v.union(
    v.object({ status: v.literal("attached"), id: v.id("noteAttachments") }),
    v.object({ status: v.literal("too_large") }),
  ),
  handler: async (ctx, args) => {
    const profile = await requireAdmin(ctx);
    if (!profile.userId) throw new Error("Administrator profile is not activated");

    const note = await ctx.db.get(args.noteId);
    if (!note || !note.isActive) throw new Error("Note not found");

    const existing = await ctx.db
      .query("noteAttachments")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
    if (existing) {
      if (existing.noteId !== args.noteId) {
        throw new Error("Uploaded file is already attached to another note");
      }
      return { status: "attached" as const, id: existing._id };
    }

    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) throw new Error("Uploaded file was not found");
    if (metadata.size > NOTE_ATTACHMENT_MAX_FILE_SIZE_BYTES) {
      await ctx.storage.delete(args.storageId);
      return { status: "too_large" as const };
    }

    const attachmentId = await ctx.db.insert("noteAttachments", {
      noteId: args.noteId,
      storageId: args.storageId,
      fileName: normalizeFileName(args.fileName),
      mimeType: metadata.contentType ?? "application/octet-stream",
      fileSize: metadata.size,
      uploadedBy: profile.userId,
      uploadedAt: Date.now(),
    });

    await ctx.db.patch(args.noteId, {
      attachmentCount: (note.attachmentCount ?? 0) + 1,
      updatedAt: Date.now(),
    });

    return { status: "attached" as const, id: attachmentId };
  },
});

export const remove = mutation({
  args: { id: v.id("noteAttachments") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const attachment = await ctx.db.get(id);
    if (!attachment) return null;

    const note = await ctx.db.get(attachment.noteId);
    await ctx.db.delete(id);
    await ctx.storage.delete(attachment.storageId);

    if (note) {
      await ctx.db.patch(note._id, {
        attachmentCount: Math.max(0, (note.attachmentCount ?? 1) - 1),
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const discardUnlinkedUpload = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.boolean(),
  handler: async (ctx, { storageId }) => {
    await requireAdmin(ctx);
    const linked = await ctx.db
      .query("noteAttachments")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .first();
    if (linked) return false;

    const metadata = await ctx.db.system.get(storageId);
    if (!metadata) return false;
    await ctx.storage.delete(storageId);
    return true;
  },
});
