import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin, getCurrentUserProfile } from "./lib/auth";
import { normalizeString } from "./lib/stringUtils";
import { internal } from "./_generated/api";

const companyGroupDoc = v.object({
  _id: v.id("companyGroups"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

async function findDuplicateGroup(
  ctx: QueryCtx | MutationCtx,
  name: string,
  excludeId?: Id<"companyGroups">,
) {
  const normalizedName = normalizeString(name);
  const groups = await ctx.db.query("companyGroups").collect();
  return groups.find(
    (group) =>
      group._id !== excludeId && normalizeString(group.name) === normalizedName,
  );
}

export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  returns: v.array(companyGroupDoc),
  handler: async (ctx, args) => {
    await getCurrentUserProfile(ctx);

    let groups = await ctx.db.query("companyGroups").collect();

    if (args.isActive !== undefined) {
      groups = groups.filter((group) => group.isActive === args.isActive);
    }

    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      groups = groups.filter(
        (group) =>
          normalizeString(group.name).includes(searchNormalized) ||
          (group.description &&
            normalizeString(group.description).includes(searchNormalized)),
      );
    }

    return groups.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listActive = query({
  args: {},
  returns: v.array(companyGroupDoc),
  handler: async (ctx) => {
    await getCurrentUserProfile(ctx);

    const groups = await ctx.db
      .query("companyGroups")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return groups.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const get = query({
  args: { id: v.id("companyGroups") },
  returns: v.union(
    v.object({
      _id: v.id("companyGroups"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
      usageCount: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { id }) => {
    await getCurrentUserProfile(ctx);

    const group = await ctx.db.get(id);
    if (!group) return null;

    const companiesUsingGroup = await ctx.db
      .query("companies")
      .withIndex("by_companyGroup", (q) => q.eq("companyGroupId", id))
      .collect();

    return {
      ...group,
      usageCount: companiesUsingGroup.length,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("companyGroups"),
  handler: async (ctx, args) => {
    await getCurrentUserProfile(ctx);

    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Name is required");
    }

    const duplicate = await findDuplicateGroup(ctx, args.name);
    if (duplicate) {
      throw new Error("A company group with this name already exists");
    }

    const now = Date.now();
    return await ctx.db.insert("companyGroups", {
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("companyGroups"),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("companyGroups"),
  handler: async (ctx, { id, ...args }) => {
    const userProfile = await requireAdmin(ctx);

    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Name is required");
    }

    const existingGroup = await ctx.db.get(id);
    if (!existingGroup) {
      throw new Error("Company group not found");
    }

    const duplicate = await findDuplicateGroup(ctx, args.name, id);
    if (duplicate) {
      throw new Error("A company group with this name already exists");
    }

    const nextName = args.name.trim();
    const now = Date.now();
    await ctx.db.patch(id, {
      name: nextName,
      description: args.description?.trim() || undefined,
      isActive: args.isActive ?? existingGroup.isActive,
      updatedAt: now,
    });

    if (nextName !== existingGroup.name) {
      const companiesUsingGroup = await ctx.db
        .query("companies")
        .withIndex("by_companyGroup", (q) => q.eq("companyGroupId", id))
        .collect();

      for (const company of companiesUsingGroup) {
        await ctx.db.patch(company._id, { groupName: nextName });
      }
    }

    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId as Id<"users">,
        action: "updated",
        entityType: "companyGroup",
        entityId: id,
        details: {
          previousName: existingGroup.name,
          newName: nextName,
        },
      });
    }

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("companyGroups") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const userProfile = await requireAdmin(ctx);

    const group = await ctx.db.get(id);
    if (!group) {
      throw new Error("Company group not found");
    }

    const companiesUsingGroup = await ctx.db
      .query("companies")
      .withIndex("by_companyGroup", (q) => q.eq("companyGroupId", id))
      .collect();

    if (companiesUsingGroup.length > 0) {
      throw new Error(
        `Cannot delete this company group because it is used by ${companiesUsingGroup.length} company(ies)`,
      );
    }

    await ctx.db.delete(id);

    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId as Id<"users">,
        action: "deleted",
        entityType: "companyGroup",
        entityId: id,
        details: {
          name: group.name,
        },
      });
    }

    return null;
  },
});

export const backfillFromGroupNames = mutation({
  args: {},
  returns: v.object({
    created: v.number(),
    linked: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const companies = await ctx.db.query("companies").collect();
    const existingGroups = await ctx.db.query("companyGroups").collect();
    const groupsByName = new Map(
      existingGroups.map((group) => [normalizeString(group.name), group._id] as const),
    );

    let created = 0;
    let linked = 0;
    const now = Date.now();

    for (const company of companies) {
      if (company.companyGroupId) continue;
      const name = company.groupName?.trim();
      if (!name) continue;

      const key = normalizeString(name);
      let groupId = groupsByName.get(key);
      if (!groupId) {
        groupId = await ctx.db.insert("companyGroups", {
          name,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        groupsByName.set(key, groupId);
        created += 1;
      }

      await ctx.db.patch(company._id, {
        companyGroupId: groupId,
        groupName: name,
      });
      linked += 1;
    }

    return { created, linked };
  },
});
