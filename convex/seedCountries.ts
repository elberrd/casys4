/**
 * Seed script to populate countries with flags
 * This is an internal mutation that bypasses authentication
 *
 * To run this script:
 * npx convex run seedCountries
 */

import { internalMutation } from "./_generated/server";
import { countries } from "../lib/data/countries-phone";

export default internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log(`Starting to seed ${countries.length} countries...`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const country of countries) {
      // Check if country already exists by name
      const existing = await ctx.db
        .query("countries")
        .filter((q) => q.eq(q.field("name"), country.name))
        .first();

      if (existing) {
        // Update existing country to add flag if it doesn't have one
        if (!existing.flag && country.flag) {
          await ctx.db.patch(existing._id, {
            code: country.code,
            flag: country.flag,
          });
          updated++;
          console.log(`Updated: ${country.name} ${country.flag}`);
        } else {
          skipped++;
        }
      } else {
        // Create new country
        await ctx.db.insert("countries", {
          name: country.name,
          code: country.code,
          iso3: "", // We don't have ISO3 data in the phone library
          flag: country.flag,
        });
        created++;
        console.log(`Created: ${country.name} ${country.flag}`);
      }
    }

    const summary = {
      total: countries.length,
      created,
      updated,
      skipped,
    };

    console.log("Seed complete:", summary);
    return summary;
  },
});
