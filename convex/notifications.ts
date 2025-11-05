import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";

/**
 * Query to get a single notification by ID
 */
export const get = query({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const notification = await ctx.db.get(args.id);

    if (!notification) {
      return null;
    }

    // Users can only see their own notifications
    if (notification.userId !== userProfile.userId) {
      return null;
    }

    return notification;
  },
});

/**
 * Query to get notifications for the current user
 * Returns paginated list with entity details populated
 */
export const getUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const limit = args.limit ?? 50;

    // Query notifications for current user
    let results = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userProfile.userId!))
      .order("desc")
      .take(limit);

    // Filter for unread only if requested
    if (args.unreadOnly) {
      results = results.filter((n) => !n.isRead);
    }

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      results = results.filter((notification) => {
        const title = normalizeString(notification.title);
        const message = normalizeString(notification.message);

        return (
          title.includes(searchNormalized) ||
          message.includes(searchNormalized)
        );
      });
    }

    return results;
  },
});

/**
 * Query to get unread notification count for the current user
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userProfile.userId!).eq("isRead", false)
      )
      .collect();

    return notifications.length;
  },
});

/**
 * Mutation to mark a notification as read
 * Only the notification owner can mark it as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Verify ownership
    if (notification.userId !== userProfile.userId) {
      throw new Error("Access denied: You can only mark your own notifications as read");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

    return args.notificationId;
  },
});

/**
 * Mutation to mark all notifications as read for the current user
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);

    // Get all unread notifications for current user
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userProfile.userId!).eq("isRead", false)
      )
      .collect();

    const now = Date.now();

    // Update all unread notifications
    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, {
          isRead: true,
          readAt: now,
        })
      )
    );

    return unreadNotifications.length;
  },
});

/**
 * Mutation to delete a notification
 * Only the notification owner can delete it
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Verify ownership
    if (notification.userId !== userProfile.userId) {
      throw new Error("Access denied: You can only delete your own notifications");
    }

    await ctx.db.delete(args.notificationId);

    return args.notificationId;
  },
});

/**
 * Internal mutation to create a notification
 * Called by other mutations when events occur
 */
export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      entityType: args.entityType,
      entityId: args.entityId,
      isRead: false,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});
