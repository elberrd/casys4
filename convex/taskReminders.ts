import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import {
  getDateInSaoPaulo,
  insertNotification,
} from "./lib/notificationHelpers";

export const reconcileDueTaskReminders = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const today = getDateInSaoPaulo();
    const [todoTasks, inProgressTasks] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_dueDate_status", (q) =>
          q.eq("dueDate", today).eq("status", "todo"),
        )
        .collect(),
      ctx.db
        .query("tasks")
        .withIndex("by_dueDate_status", (q) =>
          q.eq("dueDate", today).eq("status", "in_progress"),
        )
        .collect(),
    ]);

    let delivered = 0;
    for (const task of [...todoTasks, ...inProgressTasks]) {
      if (!task.assignedTo) continue;

      await insertNotification(ctx, {
        userId: task.assignedTo,
        type: "task_due",
        title: task.title,
        message: "Esta tarefa vence hoje.",
        entityType: "task",
        entityId: task._id,
        scheduledDate: today,
        dedupeKey: `task_due:${task._id}:${task.assignedTo}:${today}`,
      });
      delivered += 1;
    }

    return delivered;
  },
});
