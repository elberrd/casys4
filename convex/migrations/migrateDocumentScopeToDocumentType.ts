import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Migration: Copy documentScope from documentTypesLegalFrameworks to documentTypes.isCompanyDocument
 *
 * For each unique documentTypeId that has any association with documentScope === "company",
 * set isCompanyDocument = true on that document type.
 *
 * Run "preview" first to see what will be affected, then run "migrate" to apply.
 */

export const preview = mutation({
  args: {},
  handler: async (ctx) => {
    const associations = await ctx.db
      .query("documentTypesLegalFrameworks")
      .collect();

    // Find unique documentTypeIds with company scope
    const companyDocTypeIds = new Set<Id<"documentTypes">>();
    for (const assoc of associations) {
      const doc = assoc as typeof assoc & { documentScope?: string };
      if (doc.documentScope === "company") {
        companyDocTypeIds.add(assoc.documentTypeId);
      }
    }

    // Get the document type names for reporting
    const affectedTypes = [];
    for (const dtId of companyDocTypeIds) {
      const dt = await ctx.db.get(dtId);
      affectedTypes.push({
        id: dtId,
        name: dt?.name ?? "Unknown",
      });
    }

    return {
      message: `Preview: ${companyDocTypeIds.size} document type(s) will be marked as company documents.`,
      affectedTypes,
      totalAssociations: associations.length,
    };
  },
});

export const migrate = mutation({
  args: {},
  handler: async (ctx) => {
    const associations = await ctx.db
      .query("documentTypesLegalFrameworks")
      .collect();

    // Find unique documentTypeIds with company scope
    const companyDocTypeIds = new Set<Id<"documentTypes">>();
    for (const assoc of associations) {
      const doc = assoc as typeof assoc & { documentScope?: string };
      if (doc.documentScope === "company") {
        companyDocTypeIds.add(assoc.documentTypeId);
      }
    }

    // Patch each document type
    let updated = 0;
    for (const dtId of companyDocTypeIds) {
      await ctx.db.patch(dtId, { isCompanyDocument: true });
      updated++;
    }

    return {
      message: `Migration complete. Updated ${updated} document type(s) with isCompanyDocument = true.`,
    };
  },
});
