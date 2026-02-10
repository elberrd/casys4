import { mutation } from "../_generated/server";

/**
 * Migration: Rename fullName to givenNames in people table.
 * Existing records have `fullName` field; new schema expects `givenNames`.
 * This migration copies fullName -> givenNames and removes fullName.
 *
 * Run via: npx convex run migrations/renameFullNameToGivenNames:migrate
 */
export const migrate = mutation({
  handler: async (ctx) => {
    const people = await ctx.db.query("people").collect();

    let updated = 0;
    let skipped = 0;

    for (const person of people) {
      const raw = person as any;

      // If still has old fullName field and no givenNames
      if (raw.fullName && !raw.givenNames) {
        // First set the new field
        await ctx.db.patch(person._id, {
          givenNames: raw.fullName,
        } as any);

        // Then remove the old field by replacing the full document
        const doc = await ctx.db.get(person._id);
        if (doc) {
          const { fullName: _, ...rest } = doc as any;
          await ctx.db.replace(person._id, rest);
        }

        updated++;
      } else if (raw.givenNames) {
        // Already has givenNames - just remove fullName if it still exists
        if (raw.fullName) {
          const { fullName: _, ...rest } = raw;
          await ctx.db.replace(person._id, rest);
          updated++;
        } else {
          skipped++;
        }
      } else {
        console.log(`Person ${person._id} has neither fullName nor givenNames`);
        skipped++;
      }
    }

    console.log(`Migration complete: ${updated} updated, ${skipped} skipped out of ${people.length} total`);
    return { updated, skipped, total: people.length };
  },
});
