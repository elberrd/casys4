import {
  pickStructuredAddressFields,
  type StructuredAddressFields,
} from "./address-fields";
import {
  classifyPersonEmbeddedAddress,
  classifyProcessEmbeddedAddress,
  classifyProcessTableRow,
  emptyAddressMigrationCounts,
  personEmbeddedMigrationKey,
  processEmbeddedMigrationKey,
  type AddressMigrationCounts,
  type PersonMigrationSource,
  type ProcessEmbeddedMigrationSource,
  type ProcessRowMigrationSource,
} from "./address-migration";

export type MigrationPhase = "process_rows" | "process_embedded" | "people";

export type MigrationPage<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string | null;
};

export type ProcessRowRecord = ProcessRowMigrationSource;
export type ProcessRecord = ProcessEmbeddedMigrationSource;
export type PersonRecord = PersonMigrationSource;

export type AddressMigrationRunArgs = {
  dryRun: boolean;
  phase: MigrationPhase;
  cursor: string | null;
  batchSize: number;
  counts: AddressMigrationCounts;
};

export type AddressMigrationRunResult = {
  dryRun: boolean;
  phase: MigrationPhase | "done";
  isDone: boolean;
  continueCursor: string | null;
  nextPhase: MigrationPhase | "done";
  counts: AddressMigrationCounts;
  scanned: number;
};

/**
 * Ports for one migration invocation. Exactly one of the three `paginate*`
 * methods is called per `runAddressMigrationInvocation` — Convex allows only
 * one `.paginate()` per mutation.
 */
export type AddressMigrationPorts = {
  paginateProcessRows: (
    cursor: string | null,
    numItems: number,
  ) => Promise<MigrationPage<ProcessRowRecord>>;
  paginateProcesses: (
    cursor: string | null,
    numItems: number,
  ) => Promise<MigrationPage<ProcessRecord>>;
  paginatePeople: (
    cursor: string | null,
    numItems: number,
  ) => Promise<MigrationPage<PersonRecord>>;
  getProcess: (id: string) => Promise<ProcessRecord | null>;
  countProcessAddresses: (processId: string) => Promise<number>;
  hasMigrationKey: (migrationKey: string) => Promise<boolean>;
  updateProcessRow: (id: string, reportedAt?: string) => Promise<void>;
  concatenateProcessLegacy: (
    processId: string,
    nextLegacy: string,
  ) => Promise<void>;
  insertProcessBackfill: (args: {
    processId: string;
    fields: StructuredAddressFields;
    reportedAt: string;
    migrationKey: string;
    now: number;
  }) => Promise<void>;
  concatenatePersonLegacy: (personId: string, nextLegacy: string) => Promise<void>;
  insertPersonMigrated: (args: {
    personId: string;
    fields: StructuredAddressFields;
    reportedAt: string;
    migrationKey: string;
    now: number;
  }) => Promise<void>;
};

export function nextMigrationPhase(
  phase: MigrationPhase,
): MigrationPhase | "done" {
  if (phase === "process_rows") return "process_embedded";
  if (phase === "process_embedded") return "people";
  return "done";
}

/**
 * After a single paginated page: stay in-phase with the cursor, or return to
 * the caller at a phase boundary (nextPhase + null cursor) so the next
 * invocation can paginate a different table.
 */
export function resultAfterPage(
  dryRun: boolean,
  phase: MigrationPhase,
  pageIsDone: boolean,
  continueCursor: string | null,
  counts: AddressMigrationCounts,
  scanned: number,
): AddressMigrationRunResult {
  if (!pageIsDone) {
    return {
      dryRun,
      phase,
      isDone: false,
      continueCursor,
      nextPhase: phase,
      counts,
      scanned,
    };
  }

  const nextPhase = nextMigrationPhase(phase);
  if (nextPhase === "done") {
    return {
      dryRun,
      phase: "done",
      isDone: true,
      continueCursor: null,
      nextPhase: "done",
      counts,
      scanned,
    };
  }

  return {
    dryRun,
    phase,
    isDone: false,
    continueCursor: null,
    nextPhase,
    counts,
    scanned,
  };
}

/**
 * Runs exactly one paginated query. Caller must loop with nextPhase,
 * continueCursor, and counts until isDone=true.
 */
export async function runAddressMigrationInvocation(
  args: AddressMigrationRunArgs,
  ports: AddressMigrationPorts,
): Promise<AddressMigrationRunResult> {
  const counts: AddressMigrationCounts = { ...args.counts };
  let scanned = 0;

  if (args.phase === "process_rows") {
    const page = await ports.paginateProcessRows(args.cursor, args.batchSize);
    for (const row of page.page) {
      scanned += 1;
      if (row.ownerType === "person") continue;

      const processId = row.individualProcessId;
      const process = processId ? await ports.getProcess(processId) : null;
      const decision = classifyProcessTableRow(
        row,
        process?.residenceAddressAbroad,
      );

      if (decision.updateOwner) {
        counts.processRowsUpdated += 1;
        if (!args.dryRun) {
          await ports.updateProcessRow(row._id, decision.reportedAt);
        }
      }

      if (decision.concatenate && process && decision.nextLegacyAddress) {
        counts.processConcatenated += 1;
        if (!args.dryRun) {
          await ports.concatenateProcessLegacy(
            process._id,
            decision.nextLegacyAddress,
          );
        }
      }
    }

    return resultAfterPage(
      args.dryRun,
      "process_rows",
      page.isDone,
      page.continueCursor,
      counts,
      scanned,
    );
  }

  if (args.phase === "process_embedded") {
    const page = await ports.paginateProcesses(args.cursor, args.batchSize);
    for (const process of page.page) {
      scanned += 1;
      const existingCount = await ports.countProcessAddresses(process._id);
      const already = await ports.hasMigrationKey(
        processEmbeddedMigrationKey(process._id),
      );
      const decision = classifyProcessEmbeddedAddress(process, {
        hasTableRow: existingCount > 0,
        alreadyBackfilled: already,
      });

      if (decision.bucket === "processEmbeddedSkipped") continue;

      if (decision.bucket === "processConcatenated") {
        counts.processConcatenated += 1;
        if (!args.dryRun) {
          await ports.concatenateProcessLegacy(
            process._id,
            decision.nextLegacyAddress,
          );
        }
        continue;
      }

      counts.processBackfilled += 1;
      if (!args.dryRun) {
        await ports.insertProcessBackfill({
          processId: process._id,
          fields: decision.fields,
          reportedAt: decision.reportedAt,
          migrationKey: decision.migrationKey,
          now: process.createdAt ?? process._creationTime,
        });
      }
    }

    return resultAfterPage(
      args.dryRun,
      "process_embedded",
      page.isDone,
      page.continueCursor,
      counts,
      scanned,
    );
  }

  const page = await ports.paginatePeople(args.cursor, args.batchSize);
  for (const person of page.page) {
    scanned += 1;
    const already = await ports.hasMigrationKey(
      personEmbeddedMigrationKey(person._id),
    );
    const decision = classifyPersonEmbeddedAddress(person, {
      alreadyMigrated: already,
      currentLegacyAddress: person.address,
    });

    if (decision.bucket === "personSkipped") continue;

    if (decision.bucket === "personFlagOnly") {
      counts.personFlagOnly += 1;
      continue;
    }

    if (decision.bucket === "personConcatenated") {
      counts.personConcatenated += 1;
      if (!args.dryRun) {
        await ports.concatenatePersonLegacy(person._id, decision.nextLegacyAddress);
      }
      continue;
    }

    counts.personMigrated += 1;
    if (!args.dryRun) {
      await ports.insertPersonMigrated({
        personId: person._id,
        fields: pickStructuredAddressFields(decision.fields),
        reportedAt: decision.reportedAt,
        migrationKey: decision.migrationKey,
        now: person.createdAt ?? person._creationTime,
      });
    }
  }

  return resultAfterPage(
    args.dryRun,
    "people",
    page.isDone,
    page.continueCursor,
    counts,
    scanned,
  );
}

/** Caller loop: keep invoking until isDone, passing nextPhase/cursor/counts. */
export async function driveAddressMigrationUntilDone(
  ports: AddressMigrationPorts,
  options: {
    dryRun: boolean;
    batchSize: number;
    onInvocation?: (result: AddressMigrationRunResult) => void;
  },
): Promise<AddressMigrationRunResult> {
  let phase: MigrationPhase = "process_rows";
  let cursor: string | null = null;
  let counts = emptyAddressMigrationCounts();

  for (let safety = 0; safety < 10_000; safety += 1) {
    const result = await runAddressMigrationInvocation(
      {
        dryRun: options.dryRun,
        phase,
        cursor,
        batchSize: options.batchSize,
        counts,
      },
      ports,
    );
    options.onInvocation?.(result);
    if (result.isDone) return result;
    if (result.nextPhase === "done") return result;
    phase = result.nextPhase;
    cursor = result.continueCursor;
    counts = result.counts;
  }

  throw new Error("Address migration did not finish");
}
