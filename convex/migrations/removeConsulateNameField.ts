import { mutation } from "../_generated/server";

/**
 * Migration to remove the deprecated 'name' field from consulates
 * The name is now derived from the city relationship
 */
export default mutation({
  args: {},
  handler: async (ctx) => {
    const consulates = await ctx.db.query("consulates").collect();

    let updated = 0;
    for (const consulate of consulates) {
      // Check if the document has a 'name' field (using type assertion since it's not in schema)
      const doc = consulate as typeof consulate & { name?: string };

      if ("name" in doc) {
        // Extract only the fields that are in the current schema
        const cleanedDoc = {
          cityId: doc.cityId,
          address: doc.address,
          phoneNumber: doc.phoneNumber,
          email: doc.email,
          website: doc.website,
        };

        // Replace the document with only the valid fields
        await ctx.db.replace(consulate._id, cleanedDoc);
        updated++;
      }
    }

    return { message: `Migration complete. Updated ${updated} of ${consulates.length} consulates.` };
  },
});
