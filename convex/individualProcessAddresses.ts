import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getCurrentUserProfile,
  requireAdmin,
  requireClientCanAccessProcess,
} from "./lib/auth";
import { personOwnedByClient } from "./lib/personOwnership";
import { logActivitySafely } from "./lib/activityLogger";
import {
  assertCurrentAddressInvariant,
  denormalizeCurrentAddressToPerson,
  denormalizeCurrentAddressToProcess,
  hasStructuredAddressContent,
  individualProcessAddressValidator,
  insertCurrentPersonAddress,
  insertCurrentProcessAddress,
  listPersonAddresses,
  listProcessAddresses,
  persistLegacyAddressIfNeeded,
  personWritableAddressFields,
  pickStructuredAddressFields,
  processWritableAddressFields,
  requirePersonId,
  requireProcessId,
  resolveAddressOwnerType,
  structuredAddressFieldsValidator,
  unsetOtherCurrentPersonAddresses,
  unsetOtherCurrentProcessAddresses,
} from "./lib/individualProcessAddresses";
import { isValidReportedAt, todayIsoDate } from "../lib/utils/address-fields";

const addressIdValidator = v.id("individualProcessAddresses");

function requireReportedAt(reportedAt: string | undefined): string {
  const value = reportedAt?.trim() || todayIsoDate();
  if (!isValidReportedAt(value)) {
    throw new ConvexError({ code: "INVALID_REPORTED_AT" });
  }
  return value;
}

async function assertCanReadPerson(
  ctx: Parameters<typeof getCurrentUserProfile>[0],
  userProfile: Awaited<ReturnType<typeof getCurrentUserProfile>>,
  personId: Parameters<typeof personOwnedByClient>[2],
) {
  const person = await ctx.db.get(personId);
  if (!person) {
    throw new ConvexError({ code: "PERSON_NOT_FOUND" });
  }
  const allowed = await personOwnedByClient(ctx, userProfile, personId, {
    person,
  });
  if (!allowed) {
    throw new ConvexError({ code: "UNAUTHORIZED" });
  }
  return person;
}

export const listByProcess = query({
  args: { individualProcessId: v.id("individualProcesses") },
  returns: v.array(individualProcessAddressValidator),
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const process = await ctx.db.get(args.individualProcessId);
    if (!process) {
      throw new ConvexError({ code: "INDIVIDUAL_PROCESS_NOT_FOUND" });
    }
    await requireClientCanAccessProcess(ctx, userProfile, process);
    return await listProcessAddresses(ctx, args.individualProcessId);
  },
});

export const listByPerson = query({
  args: { personId: v.id("people") },
  returns: v.array(individualProcessAddressValidator),
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    await assertCanReadPerson(ctx, userProfile, args.personId);
    return await listPersonAddresses(ctx, args.personId);
  },
});

export const getCurrent = query({
  args: { individualProcessId: v.id("individualProcesses") },
  returns: v.union(individualProcessAddressValidator, v.null()),
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const process = await ctx.db.get(args.individualProcessId);
    if (!process) {
      throw new ConvexError({ code: "INDIVIDUAL_PROCESS_NOT_FOUND" });
    }
    await requireClientCanAccessProcess(ctx, userProfile, process);

    const addresses = await listProcessAddresses(ctx, args.individualProcessId);
    return addresses.find((address) => address.isCurrent) ?? null;
  },
});

export const getCurrentByPerson = query({
  args: { personId: v.id("people") },
  returns: v.union(individualProcessAddressValidator, v.null()),
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    await assertCanReadPerson(ctx, userProfile, args.personId);
    const addresses = await listPersonAddresses(ctx, args.personId);
    return addresses.find((address) => address.isCurrent) ?? null;
  },
});

export const create = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    reportedAt: v.optional(v.string()),
    ...structuredAddressFieldsValidator,
  },
  returns: addressIdValidator,
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    const process = await ctx.db.get(args.individualProcessId);
    if (!process) {
      throw new ConvexError({ code: "INDIVIDUAL_PROCESS_NOT_FOUND" });
    }

    const reportedAt = requireReportedAt(args.reportedAt);
    const fields = processWritableAddressFields(args);
    if (!hasStructuredAddressContent(fields)) {
      throw new ConvexError({ code: "ADDRESS_FIELDS_REQUIRED" });
    }

    await persistLegacyAddressIfNeeded(ctx, process);

    const userId = await getAuthUserId(ctx);
    const addressId = await insertCurrentProcessAddress(ctx, {
      individualProcessId: args.individualProcessId,
      fields,
      createdBy: userId ?? undefined,
      reportedAt,
    });

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "created",
      entityType: "individualProcessAddress",
      entityId: addressId,
      details: {
        individualProcessId: args.individualProcessId,
        ownerType: "process",
        markedAsCurrent: true,
      },
    });

    return addressId;
  },
});

export const createForPerson = mutation({
  args: {
    personId: v.id("people"),
    reportedAt: v.optional(v.string()),
    ...structuredAddressFieldsValidator,
  },
  returns: addressIdValidator,
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    const person = await ctx.db.get(args.personId);
    if (!person) {
      throw new ConvexError({ code: "PERSON_NOT_FOUND" });
    }

    const reportedAt = requireReportedAt(args.reportedAt);
    const fields = personWritableAddressFields(args);
    if (!hasStructuredAddressContent(fields)) {
      throw new ConvexError({ code: "ADDRESS_FIELDS_REQUIRED" });
    }

    const userId = await getAuthUserId(ctx);
    const addressId = await insertCurrentPersonAddress(ctx, {
      personId: args.personId,
      fields,
      createdBy: userId ?? undefined,
      reportedAt,
    });

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "created",
      entityType: "individualProcessAddress",
      entityId: addressId,
      details: {
        personId: args.personId,
        ownerType: "person",
        markedAsCurrent: true,
      },
    });

    return addressId;
  },
});

export const ensureLegacyMigrated = mutation({
  args: { individualProcessId: v.id("individualProcesses") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);
    const process = await ctx.db.get(args.individualProcessId);
    if (!process) {
      throw new ConvexError({ code: "INDIVIDUAL_PROCESS_NOT_FOUND" });
    }
    await requireClientCanAccessProcess(ctx, userProfile, process);

    const before = await listProcessAddresses(ctx, args.individualProcessId);
    await persistLegacyAddressIfNeeded(ctx, process);
    const after = await listProcessAddresses(ctx, args.individualProcessId);
    return after.length > before.length;
  },
});

export const update = mutation({
  args: {
    id: addressIdValidator,
    reportedAt: v.optional(v.string()),
    ...structuredAddressFieldsValidator,
  },
  returns: addressIdValidator,
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    const address = await ctx.db.get(args.id);
    if (!address) {
      throw new ConvexError({ code: "ADDRESS_NOT_FOUND" });
    }

    const ownerType = resolveAddressOwnerType(address);
    const reportedAt = requireReportedAt(args.reportedAt ?? address.reportedAt);
    const fields =
      ownerType === "person"
        ? personWritableAddressFields(args)
        : processWritableAddressFields(args);

    if (!hasStructuredAddressContent(fields)) {
      throw new ConvexError({ code: "ADDRESS_FIELDS_REQUIRED" });
    }

    await ctx.db.patch(args.id, {
      ...fields,
      ownerType,
      reportedAt,
      updatedAt: Date.now(),
    });

    if (address.isCurrent) {
      if (ownerType === "person") {
        await denormalizeCurrentAddressToPerson(
          ctx,
          requirePersonId(address),
          fields,
        );
      } else {
        await denormalizeCurrentAddressToProcess(
          ctx,
          requireProcessId(address),
          fields,
        );
      }
    }

    if (ownerType === "person") {
      assertCurrentAddressInvariant(
        await listPersonAddresses(ctx, requirePersonId(address)),
      );
    } else {
      assertCurrentAddressInvariant(
        await listProcessAddresses(ctx, requireProcessId(address)),
      );
    }

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "updated",
      entityType: "individualProcessAddress",
      entityId: args.id,
      details: {
        ownerType,
        individualProcessId: address.individualProcessId,
        personId: address.personId,
      },
    });

    return args.id;
  },
});

export const setCurrent = mutation({
  args: { id: addressIdValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    const address = await ctx.db.get(args.id);
    if (!address) {
      throw new ConvexError({ code: "ADDRESS_NOT_FOUND" });
    }

    const ownerType = resolveAddressOwnerType(address);

    if (ownerType === "person") {
      const personId = requirePersonId(address);
      await unsetOtherCurrentPersonAddresses(ctx, personId, args.id);
      await ctx.db.patch(args.id, {
        isCurrent: true,
        updatedAt: Date.now(),
      });
      await denormalizeCurrentAddressToPerson(
        ctx,
        personId,
        pickStructuredAddressFields(address),
      );
      assertCurrentAddressInvariant(await listPersonAddresses(ctx, personId));
    } else {
      const processId = requireProcessId(address);
      const process = await ctx.db.get(processId);
      if (!process) {
        throw new ConvexError({ code: "INDIVIDUAL_PROCESS_NOT_FOUND" });
      }
      await unsetOtherCurrentProcessAddresses(ctx, processId, args.id);
      await ctx.db.patch(args.id, {
        isCurrent: true,
        updatedAt: Date.now(),
      });
      await denormalizeCurrentAddressToProcess(
        ctx,
        processId,
        pickStructuredAddressFields(address),
      );
      assertCurrentAddressInvariant(await listProcessAddresses(ctx, processId));
    }

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "updated",
      entityType: "individualProcessAddress",
      entityId: args.id,
      details: {
        ownerType,
        individualProcessId: address.individualProcessId,
        personId: address.personId,
        markedAsCurrent: true,
      },
    });

    return null;
  },
});

export const remove = mutation({
  args: { id: addressIdValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    const address = await ctx.db.get(args.id);
    if (!address) {
      throw new ConvexError({ code: "ADDRESS_NOT_FOUND" });
    }

    const ownerType = resolveAddressOwnerType(address);

    if (ownerType === "person") {
      const personId = requirePersonId(address);
      const remaining = (await listPersonAddresses(ctx, personId)).filter(
        (item) => item._id !== args.id,
      );
      if (address.isCurrent && remaining.length > 0) {
        throw new ConvexError({ code: "CURRENT_ADDRESS_REQUIRED" });
      }
      await ctx.db.delete(args.id);
      if (remaining.length === 0) {
        await denormalizeCurrentAddressToPerson(ctx, personId, null);
      } else {
        assertCurrentAddressInvariant(remaining);
      }
    } else {
      const processId = requireProcessId(address);
      const process = await ctx.db.get(processId);
      if (!process) {
        throw new ConvexError({ code: "INDIVIDUAL_PROCESS_NOT_FOUND" });
      }
      const remaining = (await listProcessAddresses(ctx, processId)).filter(
        (item) => item._id !== args.id,
      );
      if (address.isCurrent && remaining.length > 0) {
        throw new ConvexError({ code: "CURRENT_ADDRESS_REQUIRED" });
      }
      await ctx.db.delete(args.id);
      if (remaining.length === 0) {
        await denormalizeCurrentAddressToProcess(ctx, processId, null);
      } else {
        assertCurrentAddressInvariant(remaining);
      }
    }

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "deleted",
      entityType: "individualProcessAddress",
      entityId: args.id,
      details: {
        ownerType,
        individualProcessId: address.individualProcessId,
        personId: address.personId,
      },
    });

    return null;
  },
});
