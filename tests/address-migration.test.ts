import assert from "node:assert/strict";
import test from "node:test";

import {
  hasSubstantiveAddressFields,
  isBrazilAddress,
  isBrazilFlagOnly,
  personAddressRejectsBrazil,
  processAddressRejectsNonBrazil,
} from "../lib/utils/address-fields";
import {
  classifyPersonEmbeddedAddress,
  classifyProcessEmbeddedAddress,
  classifyProcessTableRow,
  emptyAddressMigrationCounts,
  legacyTextHasMarker,
  personEmbeddedMigrationKey,
  processEmbeddedMigrationKey,
} from "../lib/utils/address-migration";
import {
  driveAddressMigrationUntilDone,
  resultAfterPage,
  runAddressMigrationInvocation,
  type AddressMigrationPorts,
  type AddressMigrationRunResult,
  type MigrationPage,
  type PersonRecord,
  type ProcessRecord,
  type ProcessRowRecord,
} from "../lib/utils/address-migration-run";
import {
  personAddressCountryIssue,
  processAddressCountryIssue,
} from "../lib/validations/addresses";
import { personSchema } from "../lib/validations/people";

const FLAG_ONLY_BR = {
  addressCountryCode: "BR",
  addressIsBrazil: true,
};

test("flag-only BR is Brazil with no substantive fields", () => {
  assert.equal(isBrazilAddress(FLAG_ONLY_BR), true);
  assert.equal(hasSubstantiveAddressFields(FLAG_ONLY_BR), false);
  assert.equal(isBrazilFlagOnly(FLAG_ONLY_BR), true);
});

test("street/city make a Brazil address substantive", () => {
  assert.equal(
    isBrazilFlagOnly({
      ...FLAG_ONLY_BR,
      addressStreet: "Rua Augusta",
      addressCity: "São Paulo",
    }),
    false,
  );
  assert.equal(
    hasSubstantiveAddressFields({
      addressStreet: "Rua Augusta",
      addressCity: "São Paulo",
    }),
    true,
  );
});

test("migration skips flag-only person: no row, no concatenation, raw fields unused", () => {
  const person = {
    _id: "person_flag",
    _creationTime: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    address: "",
    ...FLAG_ONLY_BR,
  };
  const decision = classifyPersonEmbeddedAddress(person);
  assert.equal(decision.bucket, "personFlagOnly");
  assert.equal("nextLegacyAddress" in decision, false);
  assert.equal("migrationKey" in decision, false);
  assert.equal(person.address, "");
  assert.equal(person.addressCountryCode, "BR");
  assert.equal(person.addressIsBrazil, true);
});

test("flag-only skip is idempotent on re-run", () => {
  const person = {
    _id: "person_flag",
    _creationTime: 1,
    ...FLAG_ONLY_BR,
  };
  const first = classifyPersonEmbeddedAddress(person);
  const second = classifyPersonEmbeddedAddress(person);
  assert.deepEqual(first, second);
  assert.equal(first.bucket, "personFlagOnly");
});

test("flag-only BR with country name Brasil is not concatenated into people.address", () => {
  const person = {
    _id: "person_flag_name",
    _creationTime: 1,
    address: "",
    addressCountryCode: "BR",
    addressCountryName: "Brasil",
    addressIsBrazil: true,
  };
  const decision = classifyPersonEmbeddedAddress(person);
  assert.equal(decision.bucket, "personFlagOnly");
  assert.equal("nextLegacyAddress" in decision, false);
  assert.equal(person.address, "");
  assert.equal(person.addressCountryCode, "BR");
  assert.equal(person.addressCountryName, "Brasil");
  assert.equal(person.addressIsBrazil, true);
});

test("real Brazil content is concatenated into people.address with a marker", () => {
  const person = {
    _id: "person_br",
    _creationTime: 1,
    address: "legado",
    addressCountryCode: "BR",
    addressIsBrazil: true,
    addressStreet: "Rua Augusta",
    addressNumber: "100",
    addressCity: "São Paulo",
    addressPostalCode: "01310100",
  };
  const decision = classifyPersonEmbeddedAddress(person);
  assert.equal(decision.bucket, "personConcatenated");
  if (decision.bucket !== "personConcatenated") return;
  assert.match(decision.nextLegacyAddress, /\[casys4-addr-mig:person:person_br\]/);
  assert.match(decision.nextLegacyAddress, /Rua Augusta/);
  assert.equal(
    classifyPersonEmbeddedAddress(person, {
      currentLegacyAddress: decision.nextLegacyAddress,
    }).bucket,
    "personSkipped",
  );
});

test("abroad person address is migrated to the table", () => {
  const person = {
    _id: "person_us",
    _creationTime: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    addressCountryCode: "US",
    addressCountryName: "United States",
    addressStreet: "Market St",
    addressCity: "San Francisco",
  };
  const decision = classifyPersonEmbeddedAddress(person);
  assert.equal(decision.bucket, "personMigrated");
  if (decision.bucket !== "personMigrated") return;
  assert.equal(decision.migrationKey, personEmbeddedMigrationKey("person_us"));
  assert.equal(decision.fields.addressCountryCode, "US");
  assert.equal(
    classifyPersonEmbeddedAddress(person, { alreadyMigrated: true }).bucket,
    "personSkipped",
  );
});

test("process embedded address without a row is backfilled as current process owner", () => {
  const process = {
    _id: "proc_embedded",
    _creationTime: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    addressCountryCode: "BR",
    addressIsBrazil: true,
    addressStreet: "Av Paulista",
    addressNumber: "1578",
    addressCity: "São Paulo",
    addressStateCode: "SP",
    addressPostalCode: "01310100",
  };
  const decision = classifyProcessEmbeddedAddress(process, {
    hasTableRow: false,
  });
  assert.equal(decision.bucket, "processBackfilled");
  if (decision.bucket !== "processBackfilled") return;
  assert.equal(
    decision.migrationKey,
    processEmbeddedMigrationKey("proc_embedded"),
  );
  assert.equal(decision.fields.addressStreet, "Av Paulista");
  assert.equal(decision.reportedAt, "2023-11-14");
});

test("process backfill is skipped when a table row already exists", () => {
  const process = {
    _id: "proc_embedded",
    _creationTime: 1,
    addressCountryCode: "BR",
    addressIsBrazil: true,
    addressStreet: "Av Paulista",
    addressCity: "São Paulo",
  };
  assert.equal(
    classifyProcessEmbeddedAddress(process, { hasTableRow: true }).bucket,
    "processEmbeddedSkipped",
  );
  assert.equal(
    classifyProcessEmbeddedAddress(process, { alreadyBackfilled: true }).bucket,
    "processEmbeddedSkipped",
  );
});

test("process flag-only embedded address is not backfilled", () => {
  assert.equal(
    classifyProcessEmbeddedAddress(
      {
        _id: "proc_flag",
        _creationTime: 1,
        ...FLAG_ONLY_BR,
      },
      { hasTableRow: false },
    ).bucket,
    "processEmbeddedSkipped",
  );
});

test("existing process table rows backfill ownerType and reportedAt", () => {
  const decision = classifyProcessTableRow({
    _id: "addr1",
    individualProcessId: "proc1",
    _creationTime: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    addressCountryCode: "BR",
    addressIsBrazil: true,
    addressStreet: "Rua A",
    addressCity: "Campinas",
  });
  assert.equal(decision.updateOwner, true);
  assert.equal(decision.concatenate, false);
  assert.equal(decision.reportedAt, "2023-11-14");
});

test("process row re-run is a no-op once ownerType and reportedAt exist", () => {
  const decision = classifyProcessTableRow({
    _id: "addr1",
    individualProcessId: "proc1",
    ownerType: "process",
    reportedAt: "2023-11-14",
    _creationTime: 1,
    addressCountryCode: "BR",
    addressStreet: "Rua A",
  });
  assert.equal(decision.updateOwner, false);
  assert.equal(decision.concatenate, false);
});

test("non-BR process row concatenates into residenceAddressAbroad once", () => {
  const row = {
    _id: "addr2",
    individualProcessId: "proc2",
    _creationTime: 1,
    addressCountryCode: "US",
    addressStreet: "Main St",
    addressCity: "Boston",
  };
  const first = classifyProcessTableRow(row);
  assert.equal(first.concatenate, true);
  assert.ok(first.nextLegacyAddress);
  const second = classifyProcessTableRow(row, first.nextLegacyAddress);
  assert.equal(second.concatenate, false);
  assert.equal(legacyTextHasMarker(first.nextLegacyAddress, first.marker ?? ""), true);
});

test("empty migration counts expose every required bucket", () => {
  assert.deepEqual(emptyAddressMigrationCounts(), {
    personFlagOnly: 0,
    personConcatenated: 0,
    personMigrated: 0,
    processBackfilled: 0,
    processRowsUpdated: 0,
    processConcatenated: 0,
  });
});

test("person schema allows flag-only BR without concatenation or reportedAt", () => {
  const parsed = personSchema.safeParse({
    givenNames: "Ana",
    addressCountryCode: "BR",
    addressIsBrazil: true,
    addressStreet: "",
    addressCity: "",
    reportedAt: "",
  });
  assert.equal(parsed.success, true);
});

test("person schema rejects a substantive Brazil address", () => {
  const parsed = personSchema.safeParse({
    givenNames: "Ana",
    addressCountryCode: "BR",
    addressIsBrazil: true,
    addressStreet: "Rua Augusta",
    addressCity: "São Paulo",
    reportedAt: "2026-09-24",
  });
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.equal(
    parsed.error.issues.some(
      (issue) => issue.message === "PERSON_ADDRESS_MUST_BE_ABROAD",
    ),
    true,
  );
});

test("country helpers reject BR for person and non-BR for process", () => {
  assert.equal(personAddressRejectsBrazil(FLAG_ONLY_BR), true);
  assert.equal(personAddressCountryIssue(FLAG_ONLY_BR), "PERSON_ADDRESS_MUST_BE_ABROAD");
  assert.equal(
    processAddressRejectsNonBrazil({
      addressCountryCode: "US",
      addressStreet: "Main",
    }),
    true,
  );
  assert.equal(
    processAddressCountryIssue({
      addressCountryCode: "US",
      addressStreet: "Main",
    }),
    "PROCESS_ADDRESS_MUST_BE_BRAZIL",
  );
  assert.equal(
    processAddressCountryIssue({
      addressCountryCode: "BR",
      addressStreet: "Rua A",
    }),
    null,
  );
});

type MemoryAddress = ProcessRowRecord & {
  personId?: string;
  isCurrent?: boolean;
  migrationKey?: string;
};

type MemoryStore = {
  addresses: MemoryAddress[];
  processes: ProcessRecord[];
  people: PersonRecord[];
};

function paginateByIndex<T extends { _id: string }>(
  items: T[],
  cursor: string | null,
  numItems: number,
): MigrationPage<T> {
  const sorted = [...items].sort((a, b) => a._id.localeCompare(b._id));
  const start = cursor ? Number.parseInt(cursor, 10) : 0;
  const offset = Number.isFinite(start) && start > 0 ? start : 0;
  const page = sorted.slice(offset, offset + numItems);
  const next = offset + page.length;
  const isDone = next >= sorted.length;
  return {
    page,
    isDone,
    continueCursor: isDone ? null : String(next),
  };
}

function createMemoryPorts(store: MemoryStore): AddressMigrationPorts {
  return {
    paginateProcessRows: async (cursor, numItems) =>
      paginateByIndex(store.addresses, cursor, numItems),
    paginateProcesses: async (cursor, numItems) =>
      paginateByIndex(store.processes, cursor, numItems),
    paginatePeople: async (cursor, numItems) =>
      paginateByIndex(store.people, cursor, numItems),
    getProcess: async (id) => store.processes.find((row) => row._id === id) ?? null,
    countProcessAddresses: async (processId) =>
      store.addresses.filter((row) => row.individualProcessId === processId)
        .length,
    hasMigrationKey: async (migrationKey) =>
      store.addresses.some((row) => row.migrationKey === migrationKey),
    updateProcessRow: async (id, reportedAt) => {
      const row = store.addresses.find((item) => item._id === id);
      if (!row) return;
      row.ownerType = "process";
      if (reportedAt) row.reportedAt = reportedAt;
    },
    concatenateProcessLegacy: async (processId, nextLegacy) => {
      const process = store.processes.find((row) => row._id === processId);
      if (process) process.residenceAddressAbroad = nextLegacy;
    },
    insertProcessBackfill: async (args) => {
      store.addresses.push({
        _id: `mig_${args.migrationKey}`,
        _creationTime: args.now,
        createdAt: args.now,
        individualProcessId: args.processId,
        ownerType: "process",
        isCurrent: true,
        reportedAt: args.reportedAt,
        migrationKey: args.migrationKey,
        ...args.fields,
      });
    },
    concatenatePersonLegacy: async (personId, nextLegacy) => {
      const person = store.people.find((row) => row._id === personId);
      if (person) person.address = nextLegacy;
    },
    insertPersonMigrated: async (args) => {
      store.addresses.push({
        _id: `mig_${args.migrationKey}`,
        _creationTime: args.now,
        createdAt: args.now,
        personId: args.personId,
        ownerType: "person",
        isCurrent: true,
        reportedAt: args.reportedAt,
        migrationKey: args.migrationKey,
        ...args.fields,
      });
    },
  };
}

function withPaginateCounter(ports: AddressMigrationPorts): {
  ports: AddressMigrationPorts;
  paginateCalls: () => number;
  reset: () => void;
} {
  let paginateCalls = 0;
  const count = async <T>(
    fn: (
      cursor: string | null,
      numItems: number,
    ) => Promise<MigrationPage<T>>,
    cursor: string | null,
    numItems: number,
  ) => {
    paginateCalls += 1;
    return fn(cursor, numItems);
  };
  return {
    paginateCalls: () => paginateCalls,
    reset: () => {
      paginateCalls = 0;
    },
    ports: {
      ...ports,
      paginateProcessRows: (cursor, numItems) =>
        count(ports.paginateProcessRows, cursor, numItems),
      paginateProcesses: (cursor, numItems) =>
        count(ports.paginateProcesses, cursor, numItems),
      paginatePeople: (cursor, numItems) =>
        count(ports.paginatePeople, cursor, numItems),
    },
  };
}

function emptyStore(): MemoryStore {
  return { addresses: [], processes: [], people: [] };
}

function prodShapedStore(): MemoryStore {
  const store = emptyStore();
  const ts = 1_700_000_000_000;

  for (let index = 0; index < 13; index += 1) {
    const processId = `proc_row_${String(index).padStart(2, "0")}`;
    store.processes.push({ _id: processId, _creationTime: ts, createdAt: ts });
    store.addresses.push({
      _id: `addr_row_${String(index).padStart(2, "0")}`,
      _creationTime: ts,
      createdAt: ts,
      individualProcessId: processId,
      addressCountryCode: "BR",
      addressIsBrazil: true,
      addressStreet: "Rua A",
      addressCity: "Campinas",
    });
  }

  for (let index = 0; index < 11; index += 1) {
    store.processes.push({
      _id: `proc_emb_${String(index).padStart(2, "0")}`,
      _creationTime: ts,
      createdAt: ts,
      addressCountryCode: "BR",
      addressIsBrazil: true,
      addressStreet: "Av Paulista",
      addressNumber: "1578",
      addressCity: "São Paulo",
      addressStateCode: "SP",
      addressPostalCode: "01310100",
    });
  }

  for (let index = 0; index < 23; index += 1) {
    store.people.push({
      _id: `person_flag_${String(index).padStart(2, "0")}`,
      _creationTime: ts,
      createdAt: ts,
      address: index === 0 ? "legado existente" : "",
      addressCountryCode: "BR",
      addressIsBrazil: true,
    });
  }

  store.people.push({
    _id: "person_br_real",
    _creationTime: ts,
    createdAt: ts,
    address: "legado",
    addressCountryCode: "BR",
    addressIsBrazil: true,
    addressStreet: "Rua Augusta",
    addressNumber: "100",
    addressCity: "São Paulo",
    addressPostalCode: "01310100",
  });
  store.people.push({
    _id: "person_us",
    _creationTime: ts,
    createdAt: ts,
    addressCountryCode: "US",
    addressCountryName: "United States",
    addressStreet: "Market St",
    addressCity: "San Francisco",
  });

  store.processes.push({ _id: "proc_us", _creationTime: ts, createdAt: ts });
  store.addresses.push({
    _id: "addr_us",
    _creationTime: ts,
    createdAt: ts,
    individualProcessId: "proc_us",
    addressCountryCode: "US",
    addressStreet: "Main St",
    addressCity: "Boston",
  });

  return store;
}

async function invokeCounted(
  ports: AddressMigrationPorts,
  args: Parameters<typeof runAddressMigrationInvocation>[0],
): Promise<{ result: AddressMigrationRunResult; paginateCalls: number }> {
  const counted = withPaginateCounter(ports);
  const result = await runAddressMigrationInvocation(args, counted.ports);
  return { result, paginateCalls: counted.paginateCalls() };
}

test("phase boundary after a finished page returns nextPhase with a null cursor", () => {
  const counts = emptyAddressMigrationCounts();
  const boundary = resultAfterPage(true, "process_rows", true, "cursor-should-drop", counts, 13);
  assert.equal(boundary.isDone, false);
  assert.equal(boundary.phase, "process_rows");
  assert.equal(boundary.nextPhase, "process_embedded");
  assert.equal(boundary.continueCursor, null);

  const midPage = resultAfterPage(true, "people", false, "2", counts, 2);
  assert.equal(midPage.isDone, false);
  assert.equal(midPage.nextPhase, "people");
  assert.equal(midPage.continueCursor, "2");

  const finished = resultAfterPage(true, "people", true, "9", counts, 9);
  assert.equal(finished.isDone, true);
  assert.equal(finished.phase, "done");
  assert.equal(finished.nextPhase, "done");
  assert.equal(finished.continueCursor, null);
});

test("one invocation at a phase boundary paginates at most once and does not start the next phase", async () => {
  const ports = createMemoryPorts(emptyStore());
  const first = await invokeCounted(ports, {
    dryRun: true,
    phase: "process_rows",
    cursor: null,
    batchSize: 50,
    counts: emptyAddressMigrationCounts(),
  });
  assert.equal(first.paginateCalls, 1);
  assert.equal(first.result.isDone, false);
  assert.equal(first.result.nextPhase, "process_embedded");
  assert.equal(first.result.continueCursor, null);

  const second = await invokeCounted(ports, {
    dryRun: true,
    phase: "process_embedded",
    cursor: first.result.continueCursor,
    batchSize: 50,
    counts: first.result.counts,
  });
  assert.equal(second.paginateCalls, 1);
  assert.equal(second.result.isDone, false);
  assert.equal(second.result.nextPhase, "people");
  assert.equal(second.result.continueCursor, null);

  const third = await invokeCounted(ports, {
    dryRun: true,
    phase: "people",
    cursor: second.result.continueCursor,
    batchSize: 50,
    counts: second.result.counts,
  });
  assert.equal(third.paginateCalls, 1);
  assert.equal(third.result.isDone, true);
  assert.equal(third.result.nextPhase, "done");
});

test("in-phase pagination also uses a single paginate call and keeps the same phase", async () => {
  const store = emptyStore();
  store.addresses.push(
    {
      _id: "addr_a",
      _creationTime: 1,
      individualProcessId: "proc_a",
      addressCountryCode: "BR",
      addressIsBrazil: true,
      addressStreet: "Rua A",
    },
    {
      _id: "addr_b",
      _creationTime: 1,
      individualProcessId: "proc_b",
      addressCountryCode: "BR",
      addressIsBrazil: true,
      addressStreet: "Rua B",
    },
  );
  store.processes.push(
    { _id: "proc_a", _creationTime: 1 },
    { _id: "proc_b", _creationTime: 1 },
  );

  const first = await invokeCounted(createMemoryPorts(store), {
    dryRun: true,
    phase: "process_rows",
    cursor: null,
    batchSize: 1,
    counts: emptyAddressMigrationCounts(),
  });
  assert.equal(first.paginateCalls, 1);
  assert.equal(first.result.isDone, false);
  assert.equal(first.result.nextPhase, "process_rows");
  assert.ok(first.result.continueCursor);
  assert.equal(first.result.counts.processRowsUpdated, 1);
});

test("driving every phase yields expected buckets and an idempotent re-run", async () => {
  const store = prodShapedStore();
  const ports = createMemoryPorts(store);
  const flagOnlyAddressBefore = store.people[0]?.address;
  const flagOnlyCodeBefore = store.people[0]?.addressCountryCode;
  const flagOnlyFlagBefore = store.people[0]?.addressIsBrazil;

  const invocations: number[] = [];
  const first = await driveAddressMigrationUntilDone(
    {
      ...ports,
      paginateProcessRows: async (cursor, numItems) => {
        invocations.push(1);
        return ports.paginateProcessRows(cursor, numItems);
      },
      paginateProcesses: async (cursor, numItems) => {
        invocations.push(1);
        return ports.paginateProcesses(cursor, numItems);
      },
      paginatePeople: async (cursor, numItems) => {
        invocations.push(1);
        return ports.paginatePeople(cursor, numItems);
      },
    },
    {
      dryRun: false,
      batchSize: 5,
      onInvocation: (result) => {
        if (!result.isDone && result.nextPhase !== result.phase) {
          assert.equal(result.continueCursor, null);
        }
      },
    },
  );

  assert.ok(invocations.length >= 3);
  assert.equal(first.isDone, true);
  assert.deepEqual(first.counts, {
    personFlagOnly: 23,
    personConcatenated: 1,
    personMigrated: 1,
    processBackfilled: 11,
    processRowsUpdated: 14,
    processConcatenated: 1,
  });
  assert.equal(store.people[0]?.address, flagOnlyAddressBefore);
  assert.equal(store.people[0]?.addressCountryCode, flagOnlyCodeBefore);
  assert.equal(store.people[0]?.addressIsBrazil, flagOnlyFlagBefore);
  assert.match(store.people.find((row) => row._id === "person_br_real")?.address ?? "", /\[casys4-addr-mig:person:person_br_real\]/);
  assert.equal(
    store.addresses.some((row) => row.migrationKey === "person:person_us:embedded"),
    true,
  );
  assert.equal(
    store.addresses.filter((row) => row.migrationKey?.startsWith("process:") && row.isCurrent)
      .length,
    11,
  );

  const second = await driveAddressMigrationUntilDone(createMemoryPorts(store), {
    dryRun: false,
    batchSize: 5,
    onInvocation: (result) => {
      if (!result.isDone && result.nextPhase !== result.phase) {
        assert.equal(result.continueCursor, null);
      }
    },
  });
  assert.equal(second.isDone, true);
  assert.deepEqual(second.counts, {
    personFlagOnly: 23,
    personConcatenated: 0,
    personMigrated: 0,
    processBackfilled: 0,
    processRowsUpdated: 0,
    processConcatenated: 0,
  });
});

test("each drive invocation paginates exactly once", async () => {
  const store = prodShapedStore();
  const base = createMemoryPorts(store);
  let phase: "process_rows" | "process_embedded" | "people" = "process_rows";
  let cursor: string | null = null;
  let counts = emptyAddressMigrationCounts();

  for (let step = 0; step < 200; step += 1) {
    const { result, paginateCalls } = await invokeCounted(base, {
      dryRun: true,
      phase,
      cursor,
      batchSize: 7,
      counts,
    });
    assert.equal(paginateCalls, 1, `invocation ${step} paginated ${paginateCalls} times`);
    if (result.isDone) {
      assert.equal(result.nextPhase, "done");
      return;
    }
    assert.notEqual(result.nextPhase, "done");
    if (result.nextPhase !== phase) {
      assert.equal(result.continueCursor, null);
    }
    if (result.nextPhase === "done") {
      assert.fail("nextPhase was done while isDone was false");
    } else {
      phase = result.nextPhase;
    }
    cursor = result.continueCursor;
    counts = result.counts;
  }
  assert.fail("migration drive did not reach isDone");
});

