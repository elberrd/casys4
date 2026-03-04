import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

export async function logActivitySafely(
  ctx: MutationCtx,
  args: {
    userId?: Id<"users">;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  if (!args.userId) return;

  try {
    await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
      userId: args.userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      details: args.details,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export function buildChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  for (const [key, afterValue] of Object.entries(after)) {
    const beforeValue = before[key];
    if (beforeValue !== afterValue) {
      changes[key] = {
        before: beforeValue,
        after: afterValue,
      };
    }
  }

  return changes;
}
