import { ConvexError, v } from "convex/values";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

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

export const individualProcessAddressValidator = v.object({
  _id: v.id("individualProcessAddresses"),
  _creationTime: v.number(),
  individualProcessId: v.id("individualProcesses"),
  isCurrent: v.boolean(),
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

export type StructuredAddressFields = {
  addressIsBrazil?: boolean;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCountryCode?: string;
  addressCountryName?: string;
  addressStateCode?: string;
  addressStateName?: string;
  addressCity?: string;
  addressPostalCode?: string;
};

const STRING_ADDRESS_KEYS = [
  "addressStreet",
  "addressNumber",
  "addressComplement",
  "addressNeighborhood",
  "addressCountryCode",
  "addressCountryName",
  "addressStateCode",
  "addressStateName",
  "addressCity",
  "addressPostalCode",
] as const;

export function trimOptional(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function pickStructuredAddressFields(
  source: Partial<StructuredAddressFields> | null | undefined,
): StructuredAddressFields {
  const result: StructuredAddressFields = {};
  if (!source) return result;

  if (typeof source.addressIsBrazil === "boolean") {
    result.addressIsBrazil = source.addressIsBrazil;
  }

  for (const key of STRING_ADDRESS_KEYS) {
    const trimmed = trimOptional(source[key]);
    if (trimmed) {
      result[key] = trimmed;
    }
  }

  return result;
}

export function hasStructuredAddressContent(
  source: Partial<StructuredAddressFields> | null | undefined,
): boolean {
  const fields = pickStructuredAddressFields(source);
  return STRING_ADDRESS_KEYS.some((key) => Boolean(fields[key]));
}

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

  return addresses.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return b._creationTime - a._creationTime;
  });
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

export async function unsetOtherCurrentAddresses(
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

export async function insertCurrentProcessAddress(
  ctx: MutationCtx,
  args: {
    individualProcessId: Id<"individualProcesses">;
    fields: StructuredAddressFields;
    createdBy?: Id<"users">;
    now?: number;
  },
): Promise<Id<"individualProcessAddresses">> {
  const now = args.now ?? Date.now();
  await unsetOtherCurrentAddresses(ctx, args.individualProcessId);

  const addressId = await ctx.db.insert("individualProcessAddresses", {
    individualProcessId: args.individualProcessId,
    isCurrent: true,
    ...args.fields,
    createdAt: now,
    updatedAt: now,
    ...(args.createdBy ? { createdBy: args.createdBy } : {}),
  });

  await denormalizeCurrentAddressToProcess(
    ctx,
    args.individualProcessId,
    args.fields,
  );

  const addresses = await listProcessAddresses(ctx, args.individualProcessId);
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
  if (!hasStructuredAddressContent(fields)) return;

  await insertCurrentProcessAddress(ctx, {
    individualProcessId: process._id,
    fields,
    now: process.createdAt,
  });
}

export async function upsertCurrentAddressFromFields(
  ctx: MutationCtx,
  args: {
    process: Doc<"individualProcesses">;
    fields: StructuredAddressFields;
    createdBy?: Id<"users">;
  },
): Promise<Id<"individualProcessAddresses"> | null> {
  const fields = pickStructuredAddressFields(args.fields);
  if (!hasStructuredAddressContent(fields)) {
    return null;
  }

  await persistLegacyAddressIfNeeded(ctx, args.process);
  const existing = await listProcessAddresses(ctx, args.process._id);
  const current = existing.find((address) => address.isCurrent);

  if (!current) {
    if (existing.length > 0) {
      throw new ConvexError({ code: "CURRENT_ADDRESS_REQUIRED" });
    }
    return await insertCurrentProcessAddress(ctx, {
      individualProcessId: args.process._id,
      fields,
      createdBy: args.createdBy,
    });
  }

  await ctx.db.patch(current._id, {
    ...fields,
    updatedAt: Date.now(),
  });
  await denormalizeCurrentAddressToProcess(ctx, args.process._id, fields);
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
    if (!hasStructuredAddressContent(fields)) return;
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
      individualProcessId: args.targetProcessId,
      isCurrent: address.isCurrent,
      addressIsBrazil: address.addressIsBrazil,
      addressStreet: address.addressStreet,
      addressNumber: address.addressNumber,
      addressComplement: address.addressComplement,
      addressNeighborhood: address.addressNeighborhood,
      addressCountryCode: address.addressCountryCode,
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
      pickStructuredAddressFields(current),
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
