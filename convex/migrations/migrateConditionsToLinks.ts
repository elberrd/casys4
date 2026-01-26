/**
 * Migration script to convert documentTypeConditions from having documentTypeId
 * to using the documentTypeConditionLinks junction table for many-to-many relationships.
 *
 * Run this migration ONCE after deploying the schema changes.
 *
 * Steps:
 * 1. For each condition that has a documentTypeId
 * 2. Create a link in documentTypeConditionLinks
 * 3. Remove the documentTypeId from the condition
 *
 * To run this migration, call the mutation from the Convex dashboard or CLI:
 * npx convex run migrations/migrateConditionsToLinks:migrate
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Preview migration - shows what would be migrated without making changes
 */
export const preview = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all conditions
    const conditions = await ctx.db.query("documentTypeConditions").collect();

    const report = {
      totalConditions: conditions.length,
      conditionsWithDocTypeId: 0,
      conditionsAlreadyGlobal: 0,
      linksAlreadyExist: 0,
      details: [] as Array<{
        conditionId: string;
        conditionName: string;
        documentTypeId: string | null | undefined;
        status: string;
      }>,
    };

    for (const condition of conditions) {
      // Check if this condition has a documentTypeId (old structure)
      const hasDocTypeId = condition.documentTypeId !== undefined && condition.documentTypeId !== null;

      if (hasDocTypeId) {
        report.conditionsWithDocTypeId++;

        // Check if a link already exists
        const existingLink = await ctx.db
          .query("documentTypeConditionLinks")
          .withIndex("by_documentType_condition", (q) =>
            q
              .eq("documentTypeId", condition.documentTypeId!)
              .eq("documentTypeConditionId", condition._id)
          )
          .first();

        if (existingLink) {
          report.linksAlreadyExist++;
          report.details.push({
            conditionId: condition._id,
            conditionName: condition.name,
            documentTypeId: condition.documentTypeId,
            status: "Link already exists - needs cleanup only",
          });
        } else {
          report.details.push({
            conditionId: condition._id,
            conditionName: condition.name,
            documentTypeId: condition.documentTypeId,
            status: "Needs migration - will create link",
          });
        }
      } else {
        report.conditionsAlreadyGlobal++;
        report.details.push({
          conditionId: condition._id,
          conditionName: condition.name,
          documentTypeId: null,
          status: "Already global",
        });
      }
    }

    return report;
  },
});

/**
 * Main migration mutation - automatically migrates conditions based on their documentTypeId
 * This reads the documentTypeId from existing conditions and creates links
 */
export const migrate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required to run migration");
    }

    // Get the user to set as createdBy
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const results = {
      linksCreated: 0,
      linksSkipped: 0,
      conditionsCleaned: 0,
      errors: [] as string[],
    };

    // Get all conditions
    const conditions = await ctx.db.query("documentTypeConditions").collect();

    for (const condition of conditions) {
      try {
        // Check if this condition has a documentTypeId (old structure)
        if (condition.documentTypeId) {
          // Check if link already exists
          const existingLink = await ctx.db
            .query("documentTypeConditionLinks")
            .withIndex("by_documentType_condition", (q) =>
              q
                .eq("documentTypeId", condition.documentTypeId!)
                .eq("documentTypeConditionId", condition._id)
            )
            .first();

          if (!existingLink) {
            // Create the link
            await ctx.db.insert("documentTypeConditionLinks", {
              documentTypeId: condition.documentTypeId,
              documentTypeConditionId: condition._id,
              isRequired: condition.isRequired,
              sortOrder: condition.sortOrder,
              createdAt: now,
              createdBy: user._id,
            });
            results.linksCreated++;
          } else {
            results.linksSkipped++;
          }

          // Remove documentTypeId from the condition
          await ctx.db.patch(condition._id, {
            documentTypeId: undefined,
          });
          results.conditionsCleaned++;
        }
      } catch (error) {
        results.errors.push(
          `Error processing condition ${condition._id} (${condition.name}): ${error}`
        );
      }
    }

    return results;
  },
});

/**
 * Manual migration mutation - for cases where you need to specify mappings manually
 */
export const migrateManual = mutation({
  args: {
    mappings: v.array(
      v.object({
        conditionId: v.id("documentTypeConditions"),
        documentTypeId: v.id("documentTypes"),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required to run migration");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const mapping of args.mappings) {
      try {
        // Check if link already exists
        const existingLink = await ctx.db
          .query("documentTypeConditionLinks")
          .withIndex("by_documentType_condition", (q) =>
            q
              .eq("documentTypeId", mapping.documentTypeId)
              .eq("documentTypeConditionId", mapping.conditionId)
          )
          .first();

        if (existingLink) {
          results.skipped++;
          continue;
        }

        // Get condition to copy isRequired value
        const condition = await ctx.db.get(mapping.conditionId);
        if (!condition) {
          results.errors.push(`Condition ${mapping.conditionId} not found`);
          continue;
        }

        // Create the link
        await ctx.db.insert("documentTypeConditionLinks", {
          documentTypeId: mapping.documentTypeId,
          documentTypeConditionId: mapping.conditionId,
          isRequired: condition.isRequired,
          sortOrder: condition.sortOrder,
          createdAt: now,
          createdBy: user._id,
        });

        results.created++;
      } catch (error) {
        results.errors.push(
          `Error processing mapping for condition ${mapping.conditionId}: ${error}`
        );
      }
    }

    return results;
  },
});

/**
 * Cleanup mutation - removes orphaned conditions (conditions with no links)
 * Use with caution! This will permanently delete conditions.
 */
export const cleanupOrphans = mutation({
  args: {
    dryRun: v.boolean(),
  },
  handler: async (ctx, args) => {
    const conditions = await ctx.db.query("documentTypeConditions").collect();

    const orphans = [];

    for (const condition of conditions) {
      const links = await ctx.db
        .query("documentTypeConditionLinks")
        .withIndex("by_condition", (q) =>
          q.eq("documentTypeConditionId", condition._id)
        )
        .first();

      if (!links) {
        orphans.push({
          id: condition._id,
          name: condition.name,
          code: condition.code,
        });

        if (!args.dryRun) {
          await ctx.db.delete(condition._id);
        }
      }
    }

    return {
      dryRun: args.dryRun,
      orphansFound: orphans.length,
      orphans,
      message: args.dryRun
        ? "Dry run complete. No changes made."
        : `Deleted ${orphans.length} orphaned conditions.`,
    };
  },
});
