import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Send appointment reminders daily at 9 AM UTC (6 AM EST, 7 AM BRT)
 * Checks for appointments in the next 24 hours and creates notifications
 */
crons.daily(
  "send appointment reminders",
  { hourUTC: 9, minuteUTC: 0 },
  internal.appointmentReminders.sendAppointmentReminders
);

/**
 * Reconcile date-only note alarms every day at 06:05 in Sao Paulo (09:05 UTC).
 * Individual alarms are also durably scheduled when a note is saved; this cron
 * is a safety net for data created before scheduling or interrupted workflows.
 */
crons.daily(
  "reconcile note alarms",
  { hourUTC: 9, minuteUTC: 5 },
  internal.noteReminders.reconcileDueNoteAlarms,
);

export default crons;
