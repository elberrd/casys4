import { mutation } from "../_generated/server";
import { v } from "convex/values";

export default mutation({
  args: {
    ids: v.array(v.id("caseStatuses")),
  },
  handler: async (ctx, { ids }) => {
    const results = [];

    for (const id of ids) {
      const existing = await ctx.db.get(id);
      if (!existing) {
        results.push({ id, status: "not found" });
        continue;
      }

      // Remove orderNumber by patching with undefined
      await ctx.db.patch(id, {
        orderNumber: undefined,
        updatedAt: Date.now(),
      });

      results.push({ id, name: existing.name, status: "orderNumber removed" });
    }

    return results;
  },
});
