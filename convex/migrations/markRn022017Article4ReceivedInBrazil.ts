import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { normalizeString } from "../lib/stringUtils";

const TARGET_NAMES = new Set([
  normalizeString("Resolução Normativa 02/2017 CNIg (Art. 4º)"),
  normalizeString("Resolução Normativa 02/2017 CNIg (Art. 4°)"),
]);

/** Mark the legal framework selected in the supplied screenshot as Brazil. */
export const run = internalMutation({
  args: {},
  returns: v.object({
    matchedCount: v.number(),
    updatedCount: v.number(),
  }),
  handler: async (ctx) => {
    const frameworks = await ctx.db.query("legalFrameworks").collect();
    const matching = frameworks.filter((framework) => {
      const name = normalizeString(framework.name);
      const description = normalizeString(framework.description ?? "");

      return (
        TARGET_NAMES.has(name) ||
        (name.includes("resolucao normativa 02/2017") &&
          name.includes("art. 4") &&
          description.includes("residencia, 01 ano") &&
          description.includes("recebida no brasil"))
      );
    });

    let updatedCount = 0;
    for (const framework of matching) {
      if (framework.receivedInBrazil === true) continue;
      await ctx.db.patch(framework._id, { receivedInBrazil: true });
      updatedCount += 1;
    }

    return { matchedCount: matching.length, updatedCount };
  },
});
