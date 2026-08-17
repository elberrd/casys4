import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireActiveUserProfile } from "./lib/auth";
import {
  getDateInSaoPaulo,
  insertNotification,
  validateScheduledDate,
} from "./lib/notificationHelpers";
import { normalizeString } from "./lib/stringUtils";

const notificationFields = {
  _id: v.id("notifications"),
  _creationTime: v.number(),
  userId: v.id("users"),
  type: v.string(),
  title: v.string(),
  message: v.string(),
  entityType: v.optional(v.string()),
  entityId: v.optional(v.string()),
  scheduledDate: v.optional(v.string()),
  snoozedUntil: v.optional(v.number()),
  popupDismissedAt: v.optional(v.number()),
  dedupeKey: v.optional(v.string()),
  isRead: v.boolean(),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
};

const notificationValidator = v.object(notificationFields);

const notificationDetailsValidator = v.object({
  ...notificationFields,
  navigationEntityType: v.optional(v.string()),
  navigationEntityId: v.optional(v.string()),
  navigationSection: v.optional(v.string()),
});

const scheduledNotificationValidator = v.object({
  ...notificationFields,
  sourceAvailable: v.boolean(),
});

async function getOwnedNotification(
  ctx: Parameters<typeof requireActiveUserProfile>[0],
  notificationId: Id<"notifications">,
) {
  const userProfile = await requireActiveUserProfile(ctx);
  const notification = await ctx.db.get(notificationId);

  if (!notification) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Notification not found",
    });
  }
  if (notification.userId !== userProfile.userId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You can only manage your own notifications",
    });
  }
  return notification;
}

async function isScheduledSourceAvailable(
  ctx: Parameters<typeof requireActiveUserProfile>[0],
  notification: Doc<"notifications">,
): Promise<boolean> {
  if (!notification.entityType || !notification.entityId) return false;

  if (notification.entityType === "note") {
    const noteId = ctx.db.normalizeId("notes", notification.entityId);
    if (!noteId) return false;
    const note = await ctx.db.get(noteId);
    return Boolean(
      note?.isActive &&
        note.createdBy === notification.userId &&
        note.alarmDate === notification.scheduledDate,
    );
  }

  if (notification.entityType === "task") {
    const taskId = ctx.db.normalizeId("tasks", notification.entityId);
    if (!taskId) return false;
    const task = await ctx.db.get(taskId);
    return Boolean(
      task &&
        task.assignedTo === notification.userId &&
        task.dueDate === notification.scheduledDate &&
        (task.status === "todo" || task.status === "in_progress"),
    );
  }

  return true;
}

const DOCUMENT_NOTIFICATION_TYPES = new Set([
  "client_document_uploaded",
  "document_approved",
  "document_rejected",
  "document_status_changed",
  "version_created",
]);

async function resolveNotificationNavigation(
  ctx: Parameters<typeof requireActiveUserProfile>[0],
  notification: Doc<"notifications">,
) {
  if (!notification.entityType || !notification.entityId) return {};

  // Older document notifications point at documentsDelivered. Resolve their
  // owning process so existing history opens in the right working context.
  if (notification.entityType === "document") {
    const documentId = ctx.db.normalizeId(
      "documentsDelivered",
      notification.entityId,
    );
    if (documentId) {
      const document = await ctx.db.get(documentId);
      if (document) {
        return {
          navigationEntityType: "individualProcess",
          navigationEntityId: document.individualProcessId,
          navigationSection: "documentation",
        };
      }
    }
  }

  return {
    navigationEntityType: notification.entityType,
    navigationEntityId: notification.entityId,
    ...(DOCUMENT_NOTIFICATION_TYPES.has(notification.type) &&
    notification.entityType === "individualProcess"
      ? { navigationSection: "documentation" }
      : {}),
  };
}

export const get = query({
  args: { id: v.id("notifications") },
  returns: v.union(notificationDetailsValidator, v.null()),
  handler: async (ctx, args) => {
    const userProfile = await requireActiveUserProfile(ctx);
    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== userProfile.userId) {
      return null;
    }

    return {
      ...notification,
      ...(await resolveNotificationNavigation(ctx, notification)),
    };
  },
});

export const getUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  returns: v.array(notificationValidator),
  handler: async (ctx, args) => {
    const userProfile = await requireActiveUserProfile(ctx);
    const requestedLimit = args.limit ?? 50;
    const limit = Math.min(Math.max(Math.trunc(requestedLimit), 1), 200);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userProfile.userId))
      .order("desc")
      .take(limit);

    const searchNormalized = args.search
      ? normalizeString(args.search.trim())
      : undefined;
    const results: Doc<"notifications">[] = [];
    for (const notification of notifications) {
      if (args.unreadOnly && notification.isRead) continue;
      if (searchNormalized) {
        const title = normalizeString(notification.title);
        const message = normalizeString(notification.message);
        if (
          !title.includes(searchNormalized) &&
          !message.includes(searchNormalized)
        ) {
          continue;
        }
      }
      results.push(notification);
    }
    return results;
  },
});

export const getScheduledNotifications = query({
  args: { scheduledDate: v.string() },
  returns: v.array(scheduledNotificationValidator),
  handler: async (ctx, args) => {
    validateScheduledDate(args.scheduledDate);
    const userProfile = await requireActiveUserProfile(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_scheduledDate_dismissed", (q) =>
        q
          .eq("userId", userProfile.userId)
          .eq("scheduledDate", args.scheduledDate)
          .eq("popupDismissedAt", undefined),
      )
      .order("desc")
      .take(50);

    const results: Array<Doc<"notifications"> & { sourceAvailable: boolean }> =
      [];
    for (const notification of notifications) {
      if (notification.isRead) continue;
      results.push({
        ...notification,
        sourceAvailable: await isScheduledSourceAvailable(ctx, notification),
      });
    }
    return results;
  },
});

export const getUnreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    try {
      const userProfile = await requireActiveUserProfile(ctx);
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_read", (q) =>
          q.eq("userId", userProfile.userId).eq("isRead", false),
        )
        .collect();
      return notifications.length;
    } catch {
      return 0;
    }
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    const notification = await getOwnedNotification(ctx, args.notificationId);
    if (notification.isRead && notification.popupDismissedAt)
      return notification._id;

    const now = Date.now();
    await ctx.db.patch(notification._id, {
      isRead: true,
      readAt: notification.readAt ?? now,
      popupDismissedAt: notification.popupDismissedAt ?? now,
    });
    return notification._id;
  },
});

export const markAllAsRead = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userProfile = await requireActiveUserProfile(ctx);
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userProfile.userId).eq("isRead", false),
      )
      .collect();
    const now = Date.now();
    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, {
          isRead: true,
          readAt: now,
          popupDismissedAt: notification.popupDismissedAt ?? now,
        }),
      ),
    );
    return unreadNotifications.length;
  },
});

export const snooze = mutation({
  args: {
    notificationId: v.id("notifications"),
    hours: v.union(v.literal(2), v.literal(5)),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const notification = await getOwnedNotification(ctx, args.notificationId);
    if (!notification.scheduledDate) {
      throw new ConvexError({
        code: "NOT_SCHEDULED",
        message: "Only scheduled notifications can be snoozed",
      });
    }

    const snoozedUntil = Date.now() + args.hours * 60 * 60 * 1000;
    await ctx.db.patch(notification._id, {
      isRead: false,
      readAt: undefined,
      snoozedUntil,
      popupDismissedAt: undefined,
    });
    return snoozedUntil;
  },
});

export const dismissToday = mutation({
  args: { scheduledDate: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    validateScheduledDate(args.scheduledDate);
    if (args.scheduledDate !== getDateInSaoPaulo()) {
      throw new ConvexError({
        code: "INVALID_DISMISS_DATE",
        message: "Only today's scheduled notifications can be dismissed",
      });
    }

    const userProfile = await requireActiveUserProfile(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_scheduledDate", (q) =>
        q
          .eq("userId", userProfile.userId)
          .eq("scheduledDate", args.scheduledDate),
      )
      .collect();
    const pending = notifications.filter(
      (notification) => !notification.popupDismissedAt,
    );
    const now = Date.now();
    await Promise.all(
      pending.map((notification) =>
        ctx.db.patch(notification._id, {
          popupDismissedAt: now,
        }),
      ),
    );
    return pending.length;
  },
});

export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    const notification = await getOwnedNotification(ctx, args.notificationId);
    await ctx.db.delete(notification._id);
    return notification._id;
  },
});

export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => await insertNotification(ctx, args),
});
