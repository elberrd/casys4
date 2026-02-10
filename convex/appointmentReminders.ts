import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

function getFullName(person: { givenNames: string; middleName?: string; surname?: string }): string {
  return [person.givenNames, person.middleName, person.surname].filter(Boolean).join(" ");
}

/**
 * Internal action to check for upcoming appointments and send reminders
 * Runs daily via cron job
 */
export const sendAppointmentReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<{ notificationsCreated: number; appointmentsChecked: number }> => {
    // Get appointments for the next 24 hours
    const now = Date.now();
    const tomorrow = now + 24 * 60 * 60 * 1000;

    // Query all individual processes with appointments in the next 24 hours
    const individualProcesses = await ctx.runQuery(
      internal.appointmentReminders.getUpcomingAppointments,
      {
        startTime: now,
        endTime: tomorrow,
      }
    );

    console.log(`Found ${individualProcesses.length} appointments in the next 24 hours`);

    // Create notifications for each appointment
    let notificationsCreated = 0;
    for (const process of individualProcesses) {
      try {
        // Skip if no main process ID
        if (!process.collectiveProcessId) continue;

        // Get the main process to find the company
        const collectiveProcess = await ctx.runQuery(
          internal.appointmentReminders.getCollectiveProcessForNotification,
          { collectiveProcessId: process.collectiveProcessId }
        );

        if (!collectiveProcess) continue;

        // Get person details
        const person = await ctx.runQuery(
          internal.appointmentReminders.getPersonForNotification,
          { personId: process.personId }
        );

        if (!person) continue;

        // Create notification for company users
        if (collectiveProcess.companyId) {
          await ctx.runMutation(
            internal.appointmentReminders.createAppointmentNotifications,
            {
              companyId: collectiveProcess.companyId,
              individualProcessId: process._id,
              personName: getFullName(person),
              appointmentDateTime: process.appointmentDateTime!,
            }
          );
          notificationsCreated++;
        }
      } catch (error) {
        console.error(`Error creating notification for process ${process._id}:`, error);
      }
    }

    console.log(`Created ${notificationsCreated} appointment reminder notifications`);
    return { notificationsCreated, appointmentsChecked: individualProcesses.length };
  },
});

/**
 * Internal query to get individual processes with upcoming appointments
 */
export const getUpcomingAppointments = internalQuery({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all individual processes
    const allProcesses = await ctx.db.query("individualProcesses").collect();

    // Filter for those with appointments in the target time range
    const upcomingAppointments = allProcesses.filter((process) => {
      if (!process.appointmentDateTime) return false;

      const appointmentTime = new Date(process.appointmentDateTime).getTime();
      return appointmentTime >= args.startTime && appointmentTime <= args.endTime;
    });

    return upcomingAppointments;
  },
});

/**
 * Query to list upcoming appointments (for dashboard widget)
 * Returns appointments for the next 7 days for the current user's scope
 */
export const listUpcomingAppointments = query({
  args: {
    days: v.optional(v.number()), // Default 7 days
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const now = Date.now();
    const futureDate = now + days * 24 * 60 * 60 * 1000;

    // Get all individual processes
    const allProcesses = await ctx.db.query("individualProcesses").collect();

    // Filter for those with appointments in the next N days
    const upcomingAppointments = allProcesses.filter((process) => {
      if (!process.appointmentDateTime) return false;

      const appointmentTime = new Date(process.appointmentDateTime).getTime();
      return appointmentTime >= now && appointmentTime <= futureDate;
    });

    // Sort by appointment date (earliest first)
    upcomingAppointments.sort((a, b) => {
      const timeA = new Date(a.appointmentDateTime!).getTime();
      const timeB = new Date(b.appointmentDateTime!).getTime();
      return timeA - timeB;
    });

    // Populate with person and main process data
    const appointmentsWithDetails = await Promise.all(
      upcomingAppointments.map(async (process) => {
        const person = await ctx.db.get(process.personId);
        const collectiveProcess = process.collectiveProcessId
          ? await ctx.db.get(process.collectiveProcessId)
          : null;

        return {
          individualProcess: process,
          person: person ? { _id: person._id, fullName: getFullName(person) } : null,
          collectiveProcess: collectiveProcess
            ? { _id: collectiveProcess._id, referenceNumber: collectiveProcess.referenceNumber }
            : null,
        };
      })
    );

    return appointmentsWithDetails;
  },
});

/**
 * Internal query to get collective process for notification
 */
export const getCollectiveProcessForNotification = internalQuery({
  args: {
    collectiveProcessId: v.id("collectiveProcesses"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.collectiveProcessId);
  },
});

/**
 * Internal query to get person for notification
 */
export const getPersonForNotification = internalQuery({
  args: {
    personId: v.id("people"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.personId);
  },
});

/**
 * Internal mutation to create appointment notifications for company users
 */
export const createAppointmentNotifications = internalMutation({
  args: {
    companyId: v.id("companies"),
    individualProcessId: v.id("individualProcesses"),
    personName: v.string(),
    appointmentDateTime: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all users associated with this company
    const userProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Also get admin users (they should see all appointments)
    const adminProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    // Combine and deduplicate
    const allRelevantProfiles = [...userProfiles, ...adminProfiles];
    const uniqueUserIds = new Set(
      allRelevantProfiles
        .map((p) => p.userId)
        .filter((userId) => userId !== undefined)
    );

    // Format appointment date
    const appointmentDate = new Date(args.appointmentDateTime);
    const dateStr = appointmentDate.toLocaleDateString();
    const timeStr = appointmentDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create notification for each user
    const notificationPromises = Array.from(uniqueUserIds).map((userId) =>
      ctx.db.insert("notifications", {
        userId,
        type: "appointment_reminder",
        title: "Upcoming Appointment",
        message: `Appointment for ${args.personName} on ${dateStr} at ${timeStr}`,
        entityType: "individualProcess",
        entityId: args.individualProcessId,
        isRead: false,
        createdAt: Date.now(),
      })
    );

    await Promise.all(notificationPromises);

    return uniqueUserIds.size;
  },
});
