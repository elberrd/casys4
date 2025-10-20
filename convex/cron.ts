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

export default crons;
