import {
  formatAddressAsText,
  hasSubstantiveAddressFields,
  isBrazilAddress,
  isBrazilFlagOnly,
  isValidReportedAt,
  pickStructuredAddressFields,
  reportedAtFromCreatedAt,
  type StructuredAddressFields,
} from "./address-fields";

export const ADDRESS_MIGRATION_MARKER_PREFIX = "[casys4-addr-mig:";

export type AddressMigrationBucket =
  | "personFlagOnly"
  | "personConcatenated"
  | "personMigrated"
  | "processBackfilled"
  | "processRowsUpdated"
  | "processConcatenated";

export type AddressMigrationCounts = Record<AddressMigrationBucket, number>;

export function emptyAddressMigrationCounts(): AddressMigrationCounts {
  return {
    personFlagOnly: 0,
    personConcatenated: 0,
    personMigrated: 0,
    processBackfilled: 0,
    processRowsUpdated: 0,
    processConcatenated: 0,
  };
}

export function addAddressMigrationCounts(
  target: AddressMigrationCounts,
  add: Partial<AddressMigrationCounts>,
): AddressMigrationCounts {
  return {
    personFlagOnly: target.personFlagOnly + (add.personFlagOnly ?? 0),
    personConcatenated: target.personConcatenated + (add.personConcatenated ?? 0),
    personMigrated: target.personMigrated + (add.personMigrated ?? 0),
    processBackfilled: target.processBackfilled + (add.processBackfilled ?? 0),
    processRowsUpdated: target.processRowsUpdated + (add.processRowsUpdated ?? 0),
    processConcatenated:
      target.processConcatenated + (add.processConcatenated ?? 0),
  };
}

export function addressMigrationMarker(
  owner: "person" | "process",
  id: string,
): string {
  return `${ADDRESS_MIGRATION_MARKER_PREFIX}${owner}:${id}]`;
}

export function personEmbeddedMigrationKey(personId: string): string {
  return `person:${personId}:embedded`;
}

export function processEmbeddedMigrationKey(processId: string): string {
  return `process:${processId}:embedded`;
}

export function processRowMigrationKey(addressId: string): string {
  return `process-row:${addressId}`;
}

export function legacyTextHasMarker(
  text: string | undefined | null,
  marker: string,
): boolean {
  return Boolean(text && text.includes(marker));
}

export function appendLegacyAddressText(
  existing: string | undefined | null,
  marker: string,
  formatted: string,
): string {
  const block = `${marker}\n${formatted}`;
  const current = existing?.trim();
  if (!current) return block;
  return `${current}\n${block}`;
}

type TimestampedOwner = {
  createdAt?: number;
  _creationTime: number;
};

export type PersonMigrationSource = TimestampedOwner &
  StructuredAddressFields & {
    _id: string;
    address?: string;
  };

export type PersonMigrationDecision =
  | { bucket: "personSkipped" }
  | { bucket: "personFlagOnly" }
  | {
      bucket: "personConcatenated";
      marker: string;
      formatted: string;
      nextLegacyAddress: string;
    }
  | {
      bucket: "personMigrated";
      migrationKey: string;
      reportedAt: string;
      fields: StructuredAddressFields;
    };

export function classifyPersonEmbeddedAddress(
  person: PersonMigrationSource,
  opts?: { alreadyMigrated?: boolean; currentLegacyAddress?: string },
): PersonMigrationDecision {
  const fields = pickStructuredAddressFields(person);

  if (isBrazilFlagOnly(fields)) {
    return { bucket: "personFlagOnly" };
  }

  if (!hasSubstantiveAddressFields(fields)) {
    return { bucket: "personSkipped" };
  }

  if (isBrazilAddress(fields)) {
    const marker = addressMigrationMarker("person", person._id);
    const currentLegacy = opts?.currentLegacyAddress ?? person.address;
    if (legacyTextHasMarker(currentLegacy, marker)) {
      return { bucket: "personSkipped" };
    }
    const formatted = formatAddressAsText(fields);
    return {
      bucket: "personConcatenated",
      marker,
      formatted,
      nextLegacyAddress: appendLegacyAddressText(
        currentLegacy,
        marker,
        formatted,
      ),
    };
  }

  if (opts?.alreadyMigrated) {
    return { bucket: "personSkipped" };
  }

  return {
    bucket: "personMigrated",
    migrationKey: personEmbeddedMigrationKey(person._id),
    reportedAt: reportedAtFromCreatedAt(person.createdAt, person._creationTime),
    fields,
  };
}

export type ProcessRowMigrationSource = TimestampedOwner &
  StructuredAddressFields & {
    _id: string;
    ownerType?: "person" | "process";
    reportedAt?: string;
    individualProcessId?: string;
  };

export type ProcessRowMigrationDecision = {
  updateOwner: boolean;
  concatenate: boolean;
  marker?: string;
  formatted?: string;
  nextLegacyAddress?: string;
  reportedAt?: string;
};

export function classifyProcessTableRow(
  row: ProcessRowMigrationSource,
  currentLegacyAddress?: string,
): ProcessRowMigrationDecision {
  const fields = pickStructuredAddressFields(row);
  const reportedAt =
    isValidReportedAt(row.reportedAt)
      ? row.reportedAt
      : reportedAtFromCreatedAt(row.createdAt, row._creationTime);
  const updateOwner =
    row.ownerType !== "process" || !isValidReportedAt(row.reportedAt);

  const processId = row.individualProcessId ?? row._id;
  const isNonBrazil =
    hasSubstantiveAddressFields(fields) && !isBrazilAddress(fields);

  if (!isNonBrazil) {
    return { updateOwner, concatenate: false, reportedAt };
  }

  const marker = addressMigrationMarker("process", processId);
  if (legacyTextHasMarker(currentLegacyAddress, marker)) {
    return { updateOwner, concatenate: false, reportedAt };
  }

  const formatted = formatAddressAsText(fields);
  return {
    updateOwner,
    concatenate: true,
    marker,
    formatted,
    reportedAt,
    nextLegacyAddress: appendLegacyAddressText(
      currentLegacyAddress,
      marker,
      formatted,
    ),
  };
}

export type ProcessEmbeddedMigrationSource = TimestampedOwner &
  StructuredAddressFields & {
    _id: string;
    residenceAddressAbroad?: string;
  };

export type ProcessEmbeddedDecision =
  | { bucket: "processEmbeddedSkipped" }
  | {
      bucket: "processBackfilled";
      migrationKey: string;
      reportedAt: string;
      fields: StructuredAddressFields;
    }
  | {
      bucket: "processConcatenated";
      marker: string;
      formatted: string;
      nextLegacyAddress: string;
    };

export function classifyProcessEmbeddedAddress(
  process: ProcessEmbeddedMigrationSource,
  opts?: { hasTableRow?: boolean; alreadyBackfilled?: boolean },
): ProcessEmbeddedDecision {
  if (opts?.hasTableRow || opts?.alreadyBackfilled) {
    return { bucket: "processEmbeddedSkipped" };
  }

  const fields = pickStructuredAddressFields(process);

  if (isBrazilFlagOnly(fields) || !hasSubstantiveAddressFields(fields)) {
    return { bucket: "processEmbeddedSkipped" };
  }

  if (!isBrazilAddress(fields)) {
    const marker = addressMigrationMarker("process", process._id);
    if (legacyTextHasMarker(process.residenceAddressAbroad, marker)) {
      return { bucket: "processEmbeddedSkipped" };
    }
    const formatted = formatAddressAsText(fields);
    return {
      bucket: "processConcatenated",
      marker,
      formatted,
      nextLegacyAddress: appendLegacyAddressText(
        process.residenceAddressAbroad,
        marker,
        formatted,
      ),
    };
  }

  return {
    bucket: "processBackfilled",
    migrationKey: processEmbeddedMigrationKey(process._id),
    reportedAt: reportedAtFromCreatedAt(
      process.createdAt,
      process._creationTime,
    ),
    fields,
  };
}
