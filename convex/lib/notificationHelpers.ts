import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export interface NotificationInsert {
  userId: Id<"users">;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  scheduledDate?: string;
  dedupeKey?: string;
}

export function getDateInSaoPaulo(timestamp = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

export function validateScheduledDate(date: string): void {
  if (!DATE_ONLY_PATTERN.test(date)) {
    throw new ConvexError({
      code: "INVALID_SCHEDULED_DATE",
      message: "Scheduled date must use YYYY-MM-DD format",
    });
  }

  const parsed = Date.parse(`${date}T03:00:00.000Z`);
  if (
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString().slice(0, 10) !== date
  ) {
    throw new ConvexError({
      code: "INVALID_SCHEDULED_DATE",
      message: "Scheduled date is invalid",
    });
  }
}

export async function insertNotification(
  ctx: MutationCtx,
  notification: NotificationInsert,
): Promise<Id<"notifications">> {
  if (notification.scheduledDate) {
    validateScheduledDate(notification.scheduledDate);
  }

  if (notification.dedupeKey) {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_user_dedupeKey", (q) =>
        q
          .eq("userId", notification.userId)
          .eq("dedupeKey", notification.dedupeKey),
      )
      .first();

    if (existing) return existing._id;
  }

  return await ctx.db.insert("notifications", {
    ...notification,
    isRead: false,
    createdAt: Date.now(),
  });
}
