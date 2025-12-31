import { internalMutation } from "../_generated/server";

/**
 * Migration: Rename people.funcao to people.cargo
 *
 * This migration renames the 'funcao' field to 'cargo' for all existing
 * documents in the people table to match the updated schema.
 */
export const renameFuncaoToCargo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const people = await ctx.db.query("people").collect();

    let migratedCount = 0;
    let skippedCount = 0;

    for (const person of people) {
      // @ts-ignore - accessing old field that's not in schema anymore
      if (person.funcao !== undefined) {
        // @ts-ignore - accessing old field
        const funcaoValue = person.funcao;

        // Create new object without funcao field and with cargo field
        const { funcao, ...personWithoutFuncao } = person as any;

        // Replace the entire document to remove the old field
        await ctx.db.replace(person._id, {
          ...personWithoutFuncao,
          cargo: funcaoValue,
        });

        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    return {
      total: people.length,
      migrated: migratedCount,
      skipped: skippedCount,
    };
  },
});
