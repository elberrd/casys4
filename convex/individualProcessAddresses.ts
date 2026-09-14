import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getCurrentUserProfile,
  requireAdmin,
  requireClientCanAccessProcess,
} from "./lib/auth";
import { logActivitySafely } from "./lib/activityLogger";
import {
  assertCurrentAddressInvariant,
  denormalizeCurrentAddressToProcess,
  hasStructuredAddressContent,
  individualProcessAddressValidator,
  insertCurrentProcessAddress,
  listProcessAddresses,
  persistLegacyAddressIfNeeded,
  pickStructuredAddressFields,
  structuredAddressFieldsValidator,
  toWritableAddressFields,
  unsetOtherCurrentAddresses,
} from "./lib/individualProcessAddresses";

const addressIdValidator = v.id("individualProcessAddresses");

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

    const addresses = await listProcessAddresses(ctx, args.individualProcessId);
    if (addresses.length > 0) {
      return addresses;
    }

    return [];
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

export const create = mutation({
  args: {
    individualProcessId: v.id("individualProcesses"),
    ...structuredAddressFieldsValidator,
  },
  returns: addressIdValidator,
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    const process = await ctx.db.get(args.individualProcessId);
    if (!process) {
      throw new ConvexError({ code: "INDIVIDUAL_PROCESS_NOT_FOUND" });
    }

    const fields = toWritableAddressFields(args);
    if (!hasStructuredAddressContent(fields)) {
      throw new ConvexError({ code: "ADDRESS_FIELDS_REQUIRED" });
    }

    await persistLegacyAddressIfNeeded(ctx, process);

    const userId = await getAuthUserId(ctx);
    const addressId = await insertCurrentProcessAddress(ctx, {
      individualProcessId: args.individualProcessId,
      fields,
      createdBy: userId ?? undefined,
    });

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "created",
      entityType: "individualProcessAddress",
      entityId: addressId,
      details: {
        individualProcessId: args.individualProcessId,
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
    ...structuredAddressFieldsValidator,
  },
  returns: addressIdValidator,
  handler: async (ctx, args) => {
    const userProfile = await requireAdmin(ctx);
    const address = await ctx.db.get(args.id);
    if (!address) {
      throw new ConvexError({ code: "ADDRESS_NOT_FOUND" });
    }

    const process = await ctx.db.get(address.individualProcessId);
    if (!process) {
      throw new ConvexError({ code: "INDIVIDUAL_PROCESS_NOT_FOUND" });
    }

    const fields = toWritableAddressFields(args);
    if (!hasStructuredAddressContent(fields)) {
      throw new ConvexError({ code: "ADDRESS_FIELDS_REQUIRED" });
    }

    await ctx.db.patch(args.id, {
      ...fields,
      updatedAt: Date.now(),
    });

    if (address.isCurrent) {
      await denormalizeCurrentAddressToProcess(
        ctx,
        address.individualProcessId,
        fields,
      );
    }

    const addresses = await listProcessAddresses(
      ctx,
      address.individualProcessId,
    );
    assertCurrentAddressInvariant(addresses);

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "updated",
      entityType: "individualProcessAddress",
      entityId: args.id,
      details: { individualProcessId: address.individualProcessId },
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

    const process = await ctx.db.get(address.individualProcessId);
    if (!process) {
      throw new ConvexError({ code: "INDIVIDUAL_PROCESS_NOT_FOUND" });
    }

    await unsetOtherCurrentAddresses(
      ctx,
      address.individualProcessId,
      args.id,
    );
    await ctx.db.patch(args.id, {
      isCurrent: true,
      updatedAt: Date.now(),
    });
    await denormalizeCurrentAddressToProcess(
      ctx,
      address.individualProcessId,
      pickStructuredAddressFields(address),
    );

    const addresses = await listProcessAddresses(
      ctx,
      address.individualProcessId,
    );
    assertCurrentAddressInvariant(addresses);

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "updated",
      entityType: "individualProcessAddress",
      entityId: args.id,
      details: {
        individualProcessId: address.individualProcessId,
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

    const process = await ctx.db.get(address.individualProcessId);
    if (!process) {
      throw new ConvexError({ code: "INDIVIDUAL_PROCESS_NOT_FOUND" });
    }

    const remaining = (await listProcessAddresses(
      ctx,
      address.individualProcessId,
    )).filter((item) => item._id !== args.id);

    if (address.isCurrent && remaining.length > 0) {
      throw new ConvexError({ code: "CURRENT_ADDRESS_REQUIRED" });
    }

    await ctx.db.delete(args.id);

    if (remaining.length === 0) {
      await denormalizeCurrentAddressToProcess(
        ctx,
        address.individualProcessId,
        null,
      );
    } else {
      assertCurrentAddressInvariant(remaining);
    }

    await logActivitySafely(ctx, {
      userId: userProfile.userId,
      action: "deleted",
      entityType: "individualProcessAddress",
      entityId: args.id,
      details: { individualProcessId: address.individualProcessId },
    });

    return null;
  },
});
