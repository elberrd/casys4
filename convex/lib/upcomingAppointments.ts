/**
 * Viewer-scoped upcoming RNM appointments.
 * No Convex runtime imports — callable from node:test without identity.
 *
 * Authenticated scoping matches `individualProcesses.list`:
 * - no identity → []
 * - admin → every live process with an appointment in the window
 * - client → only processes of the user's CURRENT companies
 *
 * The projected row is the dashboard subset (id, time, person name,
 * collective reference) — never the full process document.
 */

import { scopeIndividualProcessesForUser } from "./processAccessScope";

export type UpcomingAppointmentProcess = {
  _id: string;
  requestStatus?: string;
  appointmentDateTime?: string;
  personId: string;
  companyApplicantId?: string;
  userApplicantCompanyId?: string;
  collectiveProcessId?: string;
};

export type UpcomingAppointmentPerson = {
  givenNames: string;
  middleName?: string;
  surname?: string;
};

export type UpcomingAppointmentCollective = {
  companyId?: string;
  referenceNumber: string;
};

export type UpcomingAppointmentView = {
  individualProcessId: string;
  appointmentDateTime: string;
  person: { _id: string; fullName: string } | null;
  collectiveProcess: { _id: string; referenceNumber: string } | null;
};

export function personFullName(person: UpcomingAppointmentPerson): string {
  return [person.givenNames, person.middleName, person.surname]
    .filter(Boolean)
    .join(" ");
}

export function isUpcomingAppointment(
  appointmentDateTime: string | undefined,
  requestStatus: string | undefined,
  now: number,
  endTime: number,
): boolean {
  if (requestStatus === "draft") return false;
  if (!appointmentDateTime) return false;
  const appointmentTime = new Date(appointmentDateTime).getTime();
  if (Number.isNaN(appointmentTime)) return false;
  return appointmentTime >= now && appointmentTime <= endTime;
}

export function selectUpcomingAppointmentProcesses(input: {
  userProfile: { role: string } | null;
  processes: UpcomingAppointmentProcess[];
  currentCompanyIds: ReadonlySet<string>;
  collectiveById: ReadonlyMap<string, UpcomingAppointmentCollective>;
  now: number;
  endTime: number;
}): UpcomingAppointmentProcess[] {
  if (!input.userProfile) return [];

  const upcoming = input.processes.filter((process) =>
    isUpcomingAppointment(
      process.appointmentDateTime,
      process.requestStatus,
      input.now,
      input.endTime,
    ),
  );

  const collectiveCompanyIdByCollectiveId = new Map<
    string,
    string | undefined
  >();
  for (const [id, collective] of input.collectiveById) {
    collectiveCompanyIdByCollectiveId.set(id, collective.companyId);
  }

  const scoped = scopeIndividualProcessesForUser(
    input.userProfile.role,
    upcoming,
    input.currentCompanyIds,
    collectiveCompanyIdByCollectiveId,
  );

  scoped.sort((a, b) => {
    const timeA = new Date(a.appointmentDateTime!).getTime();
    const timeB = new Date(b.appointmentDateTime!).getTime();
    return timeA - timeB;
  });

  return scoped;
}

export function projectUpcomingAppointment(
  process: UpcomingAppointmentProcess,
  peopleById: ReadonlyMap<string, UpcomingAppointmentPerson>,
  collectiveById: ReadonlyMap<string, UpcomingAppointmentCollective>,
): UpcomingAppointmentView {
  const person = peopleById.get(process.personId);
  const collective = process.collectiveProcessId
    ? collectiveById.get(process.collectiveProcessId)
    : undefined;
  return {
    individualProcessId: process._id,
    appointmentDateTime: process.appointmentDateTime!,
    person: person
      ? { _id: process.personId, fullName: personFullName(person) }
      : null,
    collectiveProcess:
      process.collectiveProcessId && collective
        ? {
            _id: process.collectiveProcessId,
            referenceNumber: collective.referenceNumber,
          }
        : null,
  };
}

export function listUpcomingAppointmentsForViewer(input: {
  userProfile: { role: string } | null;
  processes: UpcomingAppointmentProcess[];
  currentCompanyIds: ReadonlySet<string>;
  collectiveById: ReadonlyMap<string, UpcomingAppointmentCollective>;
  peopleById: ReadonlyMap<string, UpcomingAppointmentPerson>;
  now: number;
  endTime: number;
}): UpcomingAppointmentView[] {
  const scoped = selectUpcomingAppointmentProcesses(input);
  return scoped.map((process) =>
    projectUpcomingAppointment(process, input.peopleById, input.collectiveById),
  );
}
