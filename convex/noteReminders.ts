import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import {
  getDateInSaoPaulo,
  insertNotification,
} from "./lib/notificationHelpers";

async function deliverReminder(
  ctx: MutationCtx,
  noteId: Id<"notes">,
  expectedAlarmDate: string,
) {
  const note = await ctx.db.get(noteId);
  if (
    !note ||
    !note.isActive ||
    note.alarmDate !== expectedAlarmDate ||
    note.alarmNotifiedAt !== undefined
  ) {
    return false;
  }

  const requestedBy = note.requestedByPersonId
    ? await ctx.db.get(note.requestedByPersonId)
    : null;
  const requestedByName = requestedBy
    ? [requestedBy.givenNames, requestedBy.middleName, requestedBy.surname]
        .filter(Boolean)
        .join(" ")
    : null;
  const subject = note.subject?.trim() || "Nota do processo";

  await insertNotification(ctx, {
    userId: note.createdBy,
    type: "note_alarm",
    title: subject,
    message: requestedByName
      ? `A nota solicitada por ${requestedByName} está programada para hoje.`
      : "Esta nota está programada para hoje.",
    entityType: "note",
    entityId: note._id,
    scheduledDate: expectedAlarmDate,
    dedupeKey: `note_alarm:${note._id}:${expectedAlarmDate}`,
  });

  await ctx.db.patch(noteId, { alarmNotifiedAt: Date.now() });
  return true;
}

export const sendNoteAlarm = internalMutation({
  args: {
    noteId: v.id("notes"),
    expectedAlarmDate: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, { noteId, expectedAlarmDate }) =>
    await deliverReminder(ctx, noteId, expectedAlarmDate),
});

export const reconcileDueNoteAlarms = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const today = getDateInSaoPaulo();
    const dueNotes = await ctx.db
      .query("notes")
      .withIndex("by_alarmDate_notified", (q) =>
        q.eq("alarmDate", today).eq("alarmNotifiedAt", undefined),
      )
      .collect();

    let delivered = 0;
    for (const note of dueNotes) {
      if (await deliverReminder(ctx, note._id, today)) delivered += 1;
    }
    return delivered;
  },
});
