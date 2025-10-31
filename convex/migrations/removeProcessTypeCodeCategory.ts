import { internalMutation } from "../_generated/server";

/**
 * Migration to remove 'code' and 'category' fields from processTypes table
 * This is a one-time migration script
 */
export const removeCodeAndCategoryFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const processTypes = await ctx.db.query("processTypes").collect();

    let updated = 0;
    for (const processType of processTypes) {
      // Check if the record has the old fields
      const hasOldFields = 'code' in processType || 'category' in processType;

      if (hasOldFields) {
        // Use replace to create a new version without the old fields
        await ctx.db.replace(processType._id, {
          name: processType.name,
          description: processType.description,
          estimatedDays: processType.estimatedDays,
          isActive: processType.isActive,
          sortOrder: processType.sortOrder,
        });
        updated++;
      }
    }

    return {
      message: `Migration complete. Updated ${updated} records.`,
      totalRecords: processTypes.length,
      updatedRecords: updated,
    };
  },
});
