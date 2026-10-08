import assert from "node:assert/strict";
import test from "node:test";

import { listUpcomingAppointmentsForViewer } from "../convex/lib/upcomingAppointments";

const NOW = Date.parse("2026-10-08T12:00:00.000Z");
const END = NOW + 7 * 24 * 60 * 60 * 1000;

const processes = [
  {
    _id: "proc-own",
    appointmentDateTime: "2026-10-09T10:00",
    personId: "person-own",
    companyApplicantId: "co-own",
    addressStreet: "MUST-NOT-LEAK",
    rnmNumber: "MUST-NOT-LEAK",
  },
  {
    _id: "proc-other",
    appointmentDateTime: "2026-10-09T11:00",
    personId: "person-other",
    companyApplicantId: "co-other",
    addressStreet: "OTHER-ADDRESS",
    rnmNumber: "OTHER-RNM",
  },
  {
    _id: "proc-collective",
    appointmentDateTime: "2026-10-10T09:00",
    personId: "person-collective",
    collectiveProcessId: "coll-own",
  },
  {
    _id: "proc-past",
    appointmentDateTime: "2026-10-01T09:00",
    personId: "person-own",
    companyApplicantId: "co-own",
  },
  {
    _id: "proc-draft",
    requestStatus: "draft",
    appointmentDateTime: "2026-10-09T12:00",
    personId: "person-own",
    companyApplicantId: "co-own",
  },
];

const peopleById = new Map([
  ["person-own", { givenNames: "Ana", surname: "Own" }],
  ["person-other", { givenNames: "Other", surname: "Person" }],
  ["person-collective", { givenNames: "Cole", surname: "Tive" }],
]);

const collectiveById = new Map([
  ["coll-own", { companyId: "co-own", referenceNumber: "REF-OWN" }],
]);

test("client/company user only sees appointments of their own company's processes", () => {
  const rows = listUpcomingAppointmentsForViewer({
    userProfile: { role: "client" },
    processes,
    currentCompanyIds: new Set(["co-own"]),
    collectiveById,
    peopleById,
    now: NOW,
    endTime: END,
  });

  assert.deepEqual(
    rows.map((row) => row.individualProcessId),
    ["proc-own", "proc-collective"],
  );
  assert.equal(rows[0]?.person?.fullName, "Ana Own");
  assert.equal(rows[1]?.collectiveProcess?.referenceNumber, "REF-OWN");
  assert.equal(
    rows.some((row) => row.individualProcessId === "proc-other"),
    false,
  );
  assert.doesNotMatch(JSON.stringify(rows), /MUST-NOT-LEAK|OTHER-ADDRESS|addressStreet/);
});

test("admin sees every live upcoming appointment and never the full process document", () => {
  const rows = listUpcomingAppointmentsForViewer({
    userProfile: { role: "admin" },
    processes,
    currentCompanyIds: new Set(),
    collectiveById,
    peopleById,
    now: NOW,
    endTime: END,
  });

  assert.deepEqual(
    rows.map((row) => row.individualProcessId),
    ["proc-own", "proc-other", "proc-collective"],
  );
  for (const row of rows) {
    assert.equal("addressStreet" in row, false);
    assert.equal("rnmNumber" in row, false);
    assert.ok("individualProcessId" in row);
    assert.ok("appointmentDateTime" in row);
    assert.ok("person" in row);
  }
});
