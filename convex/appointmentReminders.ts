import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  getClientCurrentCompanyIds,
  tryGetCurrentUserProfile,
} from "./lib/auth";
import {
  isUpcomingAppointment,
  projectUpcomingAppointment,
  selectUpcomingAppointmentProcesses,
} from "./lib/upcomingAppointments";

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
    // (client-request drafts excluded — they are not live processes).
    const upcomingAppointments = allProcesses.filter((process) => {
      if (process.requestStatus === "draft") return false;
      if (!process.appointmentDateTime) return false;

      const appointmentTime = new Date(process.appointmentDateTime).getTime();
      return appointmentTime >= args.startTime && appointmentTime <= args.endTime;
    });

    return upcomingAppointments;
  },
});

/**
 * Upcoming appointments for the signed-in user's process scope.
 * Anonymous callers receive []. Clients see only CURRENT-company processes.
 * Admins see every live appointment in the window. Rows are a projection
 * (process id, time, person name, collective reference) — not the full process.
 */
export const listUpcomingAppointments = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userProfile = await tryGetCurrentUserProfile(ctx);
    if (!userProfile) {
      return [];
    }

    const days = args.days ?? 7;
    const now = Date.now();
    const endTime = now + days * 24 * 60 * 60 * 1000;

    const allProcesses = await ctx.db.query("individualProcesses").collect();
    const currentCompanyIds =
      userProfile.role === "client"
        ? await getClientCurrentCompanyIds(ctx, userProfile)
        : new Set<Id<"companies">>();

    const processRows = allProcesses.map((process) => ({
      _id: process._id,
      requestStatus: process.requestStatus,
      appointmentDateTime: process.appointmentDateTime,
      personId: process.personId,
      companyApplicantId: process.companyApplicantId,
      userApplicantCompanyId: process.userApplicantCompanyId,
      collectiveProcessId: process.collectiveProcessId,
    }));

    const collectiveIds = new Set<string>();
    for (const process of processRows) {
      if (
        process.collectiveProcessId &&
        isUpcomingAppointment(
          process.appointmentDateTime,
          process.requestStatus,
          now,
          endTime,
        )
      ) {
        collectiveIds.add(process.collectiveProcessId);
      }
    }
    const collectiveById = new Map<
      string,
      { companyId?: string; referenceNumber: string }
    >();
    for (const collectiveId of collectiveIds) {
      const collective = await ctx.db.get(
        collectiveId as Id<"collectiveProcesses">,
      );
      if (collective) {
        collectiveById.set(collectiveId, {
          companyId: collective.companyId,
          referenceNumber: collective.referenceNumber,
        });
      }
    }

    const scoped = selectUpcomingAppointmentProcesses({
      userProfile: { role: userProfile.role },
      processes: processRows,
      currentCompanyIds,
      collectiveById,
      now,
      endTime,
    });

    const peopleById = new Map<
      string,
      { givenNames: string; middleName?: string; surname?: string }
    >();
    for (const process of scoped) {
      if (peopleById.has(process.personId)) continue;
      const person = await ctx.db.get(process.personId as Id<"people">);
      if (person) {
        peopleById.set(process.personId, {
          givenNames: person.givenNames,
          middleName: person.middleName,
          surname: person.surname,
        });
      }
    }

    return scoped.map((process) =>
      projectUpcomingAppointment(process, peopleById, collectiveById),
    );
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
