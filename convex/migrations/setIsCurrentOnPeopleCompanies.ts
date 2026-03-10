import { internalMutation } from "../_generated/server";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allRelationships = await ctx.db
      .query("peopleCompanies")
      .collect();

    let migratedCount = 0;

    for (const rel of allRelationships) {
      if (rel.isCurrent === undefined) {
        await ctx.db.patch(rel._id, { isCurrent: true });
        migratedCount++;
      }
    }

    console.log(`Migration complete: ${migratedCount} records updated with isCurrent=true`);
    return { migratedCount };
  },
});
