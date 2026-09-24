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
