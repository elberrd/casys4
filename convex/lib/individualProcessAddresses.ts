import { ConvexError, v } from "convex/values";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import {
  forceBrazilAddressFields,
  hasStructuredAddressContent,
  hasSubstantiveAddressFields,
  isBrazilAddress,
  isValidReportedAt,
  pickStructuredAddressFields as pickSharedAddressFields,
  reportedAtFromCreatedAt,
  todayIsoDate,
  trimOptional,
  type StructuredAddressFields,
} from "../../lib/utils/address-fields";

export const structuredAddressFieldsValidator = {
  addressIsBrazil: v.optional(v.boolean()),
  addressStreet: v.optional(v.string()),
  addressNumber: v.optional(v.string()),
  addressComplement: v.optional(v.string()),
  addressNeighborhood: v.optional(v.string()),
  addressCountryCode: v.optional(v.string()),
  addressCountryName: v.optional(v.string()),
  addressStateCode: v.optional(v.string()),
  addressStateName: v.optional(v.string()),
  addressCity: v.optional(v.string()),
  addressPostalCode: v.optional(v.string()),
};

export const ownerTypeValidator = v.union(
  v.literal("person"),
  v.literal("process"),
);

export const individualProcessAddressValidator = v.object({
  _id: v.id("individualProcessAddresses"),
  _creationTime: v.number(),
  ownerType: v.optional(ownerTypeValidator),
  personId: v.optional(v.id("people")),
  individualProcessId: v.optional(v.id("individualProcesses")),
  isCurrent: v.boolean(),
  reportedAt: v.optional(v.string()),
  migrationKey: v.optional(v.string()),
  addressIsBrazil: v.optional(v.boolean()),
  addressStreet: v.optional(v.string()),
  addressNumber: v.optional(v.string()),
  addressComplement: v.optional(v.string()),
  addressNeighborhood: v.optional(v.string()),
  addressCountryCode: v.optional(v.string()),
  addressCountryName: v.optional(v.string()),
  addressStateCode: v.optional(v.string()),
  addressStateName: v.optional(v.string()),
  addressCity: v.optional(v.string()),
  addressPostalCode: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.optional(v.id("users")),
});

export type { StructuredAddressFields };

export { trimOptional };

export function pickStructuredAddressFields(
  source: Partial<StructuredAddressFields> | null | undefined,
): StructuredAddressFields {
  return pickSharedAddressFields(source);
}

export { hasStructuredAddressContent };

export function toWritableAddressFields(
  source: Partial<StructuredAddressFields>,
): StructuredAddressFields {
  const fields: StructuredAddressFields = {
    addressStreet: trimOptional(source.addressStreet) ?? "",
    addressNumber: trimOptional(source.addressNumber) ?? "",
    addressComplement: trimOptional(source.addressComplement) ?? "",
    addressNeighborhood: trimOptional(source.addressNeighborhood) ?? "",
    addressCountryCode: trimOptional(source.addressCountryCode) ?? "",
    addressCountryName: trimOptional(source.addressCountryName) ?? "",
    addressStateCode: trimOptional(source.addressStateCode) ?? "",
    addressStateName: trimOptional(source.addressStateName) ?? "",
    addressCity: trimOptional(source.addressCity) ?? "",
    addressPostalCode: trimOptional(source.addressPostalCode) ?? "",
  };
  if (typeof source.addressIsBrazil === "boolean") {
    fields.addressIsBrazil = source.addressIsBrazil;
  }
  return fields;
}

export function resolveAddressOwnerType(
  address: Pick<
    Doc<"individualProcessAddresses">,
    "ownerType" | "personId" | "individualProcessId"
  >,
): "person" | "process" {
  if (address.ownerType === "person" || address.ownerType === "process") {
    return address.ownerType;
  }
  if (address.personId && !address.individualProcessId) return "person";
  return "process";
}

export function requireProcessId(
  address: Pick<Doc<"individualProcessAddresses">, "individualProcessId">,
): Id<"individualProcesses"> {
  if (!address.individualProcessId) {
    throw new ConvexError({ code: "ADDRESS_OWNER_MISMATCH" });
  }
  return address.individualProcessId;
}

export function requirePersonId(
  address: Pick<Doc<"individualProcessAddresses">, "personId">,
): Id<"people"> {
  if (!address.personId) {
    throw new ConvexError({ code: "ADDRESS_OWNER_MISMATCH" });
  }
  return address.personId;
}

export function assertReportedAt(reportedAt: string): void {
  if (!isValidReportedAt(reportedAt)) {
    throw new ConvexError({ code: "INVALID_REPORTED_AT" });
  }
}

export function assertPersonAddressCountry(
  fields: Partial<StructuredAddressFields>,
): void {
  if (isBrazilAddress(fields)) {
    throw new ConvexError({ code: "PERSON_ADDRESS_MUST_BE_ABROAD" });
  }
}

export function assertProcessAddressCountry(
  fields: Partial<StructuredAddressFields>,
): void {
  const hasContent =
    hasSubstantiveAddressFields(fields) || hasStructuredAddressContent(fields);
  if (hasContent && !isBrazilAddress(fields)) {
    throw new ConvexError({ code: "PROCESS_ADDRESS_MUST_BE_BRAZIL" });
  }
}

export function processWritableAddressFields(
  source: Partial<StructuredAddressFields>,
): StructuredAddressFields {
  const fields = toWritableAddressFields(source);
  assertProcessAddressCountry({
    ...fields,
    addressIsBrazil: fields.addressIsBrazil ?? true,
    addressCountryCode: fields.addressCountryCode || "BR",
  });
  return forceBrazilAddressFields(fields);
}

export function personWritableAddressFields(
  source: Partial<StructuredAddressFields>,
): StructuredAddressFields {
  const fields = toWritableAddressFields(source);
  assertPersonAddressCountry(fields);
  return {
    ...fields,
    addressIsBrazil: false,
  };
}

function sortAddresses(
  addresses: Doc<"individualProcessAddresses">[],
): Doc<"individualProcessAddresses">[] {
  return addresses.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return b._creationTime - a._creationTime;
  });
}

export async function listProcessAddresses(
  ctx: QueryCtx | MutationCtx,
  individualProcessId: Id<"individualProcesses">,
): Promise<Doc<"individualProcessAddresses">[]> {
  const addresses = await ctx.db
    .query("individualProcessAddresses")
    .withIndex("by_individualProcess", (q) =>
      q.eq("individualProcessId", individualProcessId),
    )
    .collect();

  return sortAddresses(addresses);
}

export async function listPersonAddresses(
  ctx: QueryCtx | MutationCtx,
  personId: Id<"people">,
): Promise<Doc<"individualProcessAddresses">[]> {
  const addresses = await ctx.db
    .query("individualProcessAddresses")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();

  return sortAddresses(addresses);
}

export async function findAddressByMigrationKey(
  ctx: QueryCtx | MutationCtx,
  migrationKey: string,
): Promise<Doc<"individualProcessAddresses"> | null> {
  return await ctx.db
    .query("individualProcessAddresses")
    .withIndex("by_migrationKey", (q) => q.eq("migrationKey", migrationKey))
    .first();
}

export function assertCurrentAddressInvariant(
  addresses: Array<{ isCurrent: boolean }>,
): void {
  if (addresses.length === 0) return;

  const currentCount = addresses.filter((address) => address.isCurrent).length;
  if (currentCount === 0) {
    throw new ConvexError({ code: "CURRENT_ADDRESS_REQUIRED" });
  }
  if (currentCount > 1) {
    throw new ConvexError({ code: "MULTIPLE_CURRENT_ADDRESSES" });
  }
}

export async function denormalizeCurrentAddressToProcess(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
  fields: StructuredAddressFields | null,
): Promise<void> {
  await ctx.db.patch(individualProcessId, {
    addressIsBrazil: fields?.addressIsBrazil,
    addressStreet: fields?.addressStreet ?? "",
    addressNumber: fields?.addressNumber ?? "",
    addressComplement: fields?.addressComplement ?? "",
    addressNeighborhood: fields?.addressNeighborhood ?? "",
    addressCountryCode: fields?.addressCountryCode ?? "",
    addressCountryName: fields?.addressCountryName ?? "",
    addressStateCode: fields?.addressStateCode ?? "",
    addressStateName: fields?.addressStateName ?? "",
    addressCity: fields?.addressCity ?? "",
    addressPostalCode: fields?.addressPostalCode ?? "",
    updatedAt: Date.now(),
  });
}

export async function denormalizeCurrentAddressToPerson(
  ctx: MutationCtx,
  personId: Id<"people">,
  fields: StructuredAddressFields | null,
): Promise<void> {
  await ctx.db.patch(personId, {
    addressIsBrazil: fields?.addressIsBrazil,
    addressStreet: fields?.addressStreet ?? "",
    addressNumber: fields?.addressNumber ?? "",
    addressComplement: fields?.addressComplement ?? "",
    addressNeighborhood: fields?.addressNeighborhood ?? "",
    addressCountryCode: fields?.addressCountryCode ?? "",
    addressCountryName: fields?.addressCountryName ?? "",
    addressStateCode: fields?.addressStateCode ?? "",
    addressStateName: fields?.addressStateName ?? "",
    addressCity: fields?.addressCity ?? "",
    addressPostalCode: fields?.addressPostalCode ?? "",
    updatedAt: Date.now(),
  });
}

export async function unsetOtherCurrentProcessAddresses(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
  exceptId?: Id<"individualProcessAddresses">,
): Promise<void> {
  const currentAddresses = await ctx.db
    .query("individualProcessAddresses")
    .withIndex("by_individualProcess_and_isCurrent", (q) =>
      q.eq("individualProcessId", individualProcessId).eq("isCurrent", true),
    )
    .collect();

  for (const address of currentAddresses) {
    if (exceptId && address._id === exceptId) continue;
    if (!address.isCurrent) continue;
    await ctx.db.patch(address._id, {
      isCurrent: false,
      updatedAt: Date.now(),
    });
  }
}

export async function unsetOtherCurrentPersonAddresses(
  ctx: MutationCtx,
  personId: Id<"people">,
  exceptId?: Id<"individualProcessAddresses">,
): Promise<void> {
  const currentAddresses = await ctx.db
    .query("individualProcessAddresses")
    .withIndex("by_person_and_isCurrent", (q) =>
      q.eq("personId", personId).eq("isCurrent", true),
    )
    .collect();

  for (const address of currentAddresses) {
    if (exceptId && address._id === exceptId) continue;
    if (!address.isCurrent) continue;
    await ctx.db.patch(address._id, {
      isCurrent: false,
      updatedAt: Date.now(),
    });
  }
}

/** @deprecated Use unsetOtherCurrentProcessAddresses */
export const unsetOtherCurrentAddresses = unsetOtherCurrentProcessAddresses;

export async function insertCurrentProcessAddress(
  ctx: MutationCtx,
  args: {
    individualProcessId: Id<"individualProcesses">;
    fields: StructuredAddressFields;
    createdBy?: Id<"users">;
    now?: number;
    reportedAt?: string;
    migrationKey?: string;
    isCurrent?: boolean;
  },
): Promise<Id<"individualProcessAddresses">> {
  const now = args.now ?? Date.now();
  const fields = processWritableAddressFields(args.fields);
  const reportedAt = args.reportedAt ?? todayIsoDate(now);
  assertReportedAt(reportedAt);

  const isCurrent = args.isCurrent !== false;
  if (isCurrent) {
    await unsetOtherCurrentProcessAddresses(ctx, args.individualProcessId);
  }

  const addressId = await ctx.db.insert("individualProcessAddresses", {
    ownerType: "process",
    individualProcessId: args.individualProcessId,
    isCurrent,
    reportedAt,
    ...(args.migrationKey ? { migrationKey: args.migrationKey } : {}),
    ...fields,
    createdAt: now,
    updatedAt: now,
    ...(args.createdBy ? { createdBy: args.createdBy } : {}),
  });

  if (isCurrent) {
    await denormalizeCurrentAddressToProcess(
      ctx,
      args.individualProcessId,
      fields,
    );
  }

  const addresses = await listProcessAddresses(ctx, args.individualProcessId);
  assertCurrentAddressInvariant(addresses);
  return addressId;
}

export async function insertCurrentPersonAddress(
  ctx: MutationCtx,
  args: {
    personId: Id<"people">;
    fields: StructuredAddressFields;
    createdBy?: Id<"users">;
    now?: number;
    reportedAt?: string;
    migrationKey?: string;
    isCurrent?: boolean;
  },
): Promise<Id<"individualProcessAddresses">> {
  const now = args.now ?? Date.now();
  const fields = personWritableAddressFields(args.fields);
  const reportedAt = args.reportedAt ?? todayIsoDate(now);
  assertReportedAt(reportedAt);

  const isCurrent = args.isCurrent !== false;
  if (isCurrent) {
    await unsetOtherCurrentPersonAddresses(ctx, args.personId);
  }

  const addressId = await ctx.db.insert("individualProcessAddresses", {
    ownerType: "person",
    personId: args.personId,
    isCurrent,
    reportedAt,
    ...(args.migrationKey ? { migrationKey: args.migrationKey } : {}),
    ...fields,
    createdAt: now,
    updatedAt: now,
    ...(args.createdBy ? { createdBy: args.createdBy } : {}),
  });

  if (isCurrent) {
    await denormalizeCurrentAddressToPerson(ctx, args.personId, fields);
  }

  const addresses = await listPersonAddresses(ctx, args.personId);
  assertCurrentAddressInvariant(addresses);
  return addressId;
}

export async function persistLegacyAddressIfNeeded(
  ctx: MutationCtx,
  process: Doc<"individualProcesses">,
): Promise<void> {
  const existing = await listProcessAddresses(ctx, process._id);
  if (existing.length === 1) {
    const only = existing[0];
    if (only && !only.isCurrent) {
      await ctx.db.patch(only._id, {
        isCurrent: true,
        updatedAt: Date.now(),
      });
      await denormalizeCurrentAddressToProcess(
        ctx,
        process._id,
        pickStructuredAddressFields(only),
      );
    }
    return;
  }

  if (existing.length > 0) return;

  const fields = pickStructuredAddressFields(process);
  if (!hasSubstantiveAddressFields(fields)) return;
  if (!isBrazilAddress(fields)) return;

  await insertCurrentProcessAddress(ctx, {
    individualProcessId: process._id,
    fields,
    now: process.createdAt,
    reportedAt: reportedAtFromCreatedAt(process.createdAt, process._creationTime),
  });
}

export async function upsertCurrentAddressFromFields(
  ctx: MutationCtx,
  args: {
    process: Doc<"individualProcesses">;
    fields: StructuredAddressFields;
    createdBy?: Id<"users">;
    reportedAt?: string;
  },
): Promise<Id<"individualProcessAddresses"> | null> {
  const fields = pickStructuredAddressFields(args.fields);
  if (!hasStructuredAddressContent(fields)) {
    return null;
  }
  if (!hasSubstantiveAddressFields(fields) && isBrazilAddress(fields)) {
    return null;
  }

  const writable = processWritableAddressFields(fields);
  await persistLegacyAddressIfNeeded(ctx, args.process);
  const existing = await listProcessAddresses(ctx, args.process._id);
  const current = existing.find((address) => address.isCurrent);
  const reportedAt = args.reportedAt ?? todayIsoDate();
  assertReportedAt(reportedAt);

  if (!current) {
    if (existing.length > 0) {
      throw new ConvexError({ code: "CURRENT_ADDRESS_REQUIRED" });
    }
    return await insertCurrentProcessAddress(ctx, {
      individualProcessId: args.process._id,
      fields: writable,
      createdBy: args.createdBy,
      reportedAt,
    });
  }

  await ctx.db.patch(current._id, {
    ...writable,
    ownerType: "process",
    reportedAt,
    updatedAt: Date.now(),
  });
  await denormalizeCurrentAddressToProcess(ctx, args.process._id, writable);
  return current._id;
}

export async function upsertCurrentPersonAddressFromFields(
  ctx: MutationCtx,
  args: {
    personId: Id<"people">;
    fields: StructuredAddressFields;
    createdBy?: Id<"users">;
    reportedAt?: string;
    now?: number;
  },
): Promise<Id<"individualProcessAddresses"> | null> {
  const fields = pickStructuredAddressFields(args.fields);
  if (!hasStructuredAddressContent(fields) && !hasSubstantiveAddressFields(fields)) {
    return null;
  }
  if (isBrazilAddress(fields) && !hasSubstantiveAddressFields(fields)) {
    return null;
  }

  const writable = personWritableAddressFields(fields);
  const existing = await listPersonAddresses(ctx, args.personId);
  const current = existing.find((address) => address.isCurrent);
  const reportedAt = args.reportedAt ?? todayIsoDate(args.now);
  assertReportedAt(reportedAt);

  if (!current) {
    if (existing.length > 0) {
      throw new ConvexError({ code: "CURRENT_ADDRESS_REQUIRED" });
    }
    return await insertCurrentPersonAddress(ctx, {
      personId: args.personId,
      fields: writable,
      createdBy: args.createdBy,
      reportedAt,
      now: args.now,
    });
  }

  await ctx.db.patch(current._id, {
    ...writable,
    ownerType: "person",
    reportedAt,
    updatedAt: Date.now(),
  });
  await denormalizeCurrentAddressToPerson(ctx, args.personId, writable);
  return current._id;
}

export async function copyProcessAddresses(
  ctx: MutationCtx,
  args: {
    sourceProcessId: Id<"individualProcesses">;
    targetProcessId: Id<"individualProcesses">;
    createdBy?: Id<"users">;
  },
): Promise<void> {
  const source = await ctx.db.get(args.sourceProcessId);
  if (!source) return;

  const sourceAddresses = await listProcessAddresses(ctx, args.sourceProcessId);
  const now = Date.now();

  if (sourceAddresses.length === 0) {
    const fields = pickStructuredAddressFields(source);
    if (!hasSubstantiveAddressFields(fields) || !isBrazilAddress(fields)) {
      return;
    }
    await insertCurrentProcessAddress(ctx, {
      individualProcessId: args.targetProcessId,
      fields,
      createdBy: args.createdBy,
      now,
    });
    return;
  }

  for (const address of sourceAddresses) {
    await ctx.db.insert("individualProcessAddresses", {
      ownerType: "process",
      individualProcessId: args.targetProcessId,
      isCurrent: address.isCurrent,
      reportedAt: address.reportedAt ?? todayIsoDate(now),
      addressIsBrazil: true,
      addressStreet: address.addressStreet,
      addressNumber: address.addressNumber,
      addressComplement: address.addressComplement,
      addressNeighborhood: address.addressNeighborhood,
      addressCountryCode: address.addressCountryCode || "BR",
      addressCountryName: address.addressCountryName,
      addressStateCode: address.addressStateCode,
      addressStateName: address.addressStateName,
      addressCity: address.addressCity,
      addressPostalCode: address.addressPostalCode,
      createdAt: now,
      updatedAt: now,
      ...(args.createdBy ? { createdBy: args.createdBy } : {}),
    });
  }

  const current = sourceAddresses.find((address) => address.isCurrent);
  if (current) {
    await denormalizeCurrentAddressToProcess(
      ctx,
      args.targetProcessId,
      processWritableAddressFields(pickStructuredAddressFields(current)),
    );
  }

  const copied = await listProcessAddresses(ctx, args.targetProcessId);
  assertCurrentAddressInvariant(copied);
}

export async function deleteProcessAddresses(
  ctx: MutationCtx,
  individualProcessId: Id<"individualProcesses">,
): Promise<number> {
  const addresses = await listProcessAddresses(ctx, individualProcessId);
  for (const address of addresses) {
    await ctx.db.delete(address._id);
  }
  return addresses.length;
}

export async function deletePersonAddresses(
  ctx: MutationCtx,
  personId: Id<"people">,
): Promise<number> {
  const addresses = await listPersonAddresses(ctx, personId);
  for (const address of addresses) {
    await ctx.db.delete(address._id);
  }
  return addresses.length;
}

export function sanitizePersonAddressInput<
  T extends Partial<StructuredAddressFields>,
>(data: T): T {
  const fields = pickStructuredAddressFields(data);
  if (isBrazilAddress(fields) && hasSubstantiveAddressFields(fields)) {
    throw new ConvexError({ code: "PERSON_ADDRESS_MUST_BE_ABROAD" });
  }
  if (!isBrazilAddress(fields)) {
    return { ...data, addressIsBrazil: false } as T;
  }

  const countryCode = trimOptional(data.addressCountryCode);
  const stripped = { ...data } as T & StructuredAddressFields;
  delete stripped.addressIsBrazil;
  if (countryCode && countryCode.toUpperCase() === "BR") {
    delete stripped.addressCountryCode;
    delete stripped.addressCountryName;
  }
  return stripped;
}
