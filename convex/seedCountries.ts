/**
 * Seed script to populate countries with flags
 * This is an internal mutation that bypasses authentication
 *
 * To run this script:
 * npx convex run seedCountries
 */

import { internalMutation } from "./_generated/server";
import { countries } from "../lib/data/countries-phone";
import { resolveOfficialCountryName } from "../lib/data/country-official-names-pt";

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

      const officialName = resolveOfficialCountryName(country.code, country.name);

      if (existing) {
        const patch: {
          code?: string;
          flag?: string;
          fullName?: string;
        } = {};
        if (!existing.flag && country.flag) {
          patch.code = country.code;
          patch.flag = country.flag;
        }
        if (!existing.fullName && officialName) {
          patch.fullName = officialName;
        }
        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(existing._id, patch);
          updated++;
          console.log(`Updated: ${country.name} ${country.flag ?? ""}`);
        } else {
          skipped++;
        }
      } else {
        await ctx.db.insert("countries", {
          name: country.name,
          code: country.code,
          iso3: "",
          flag: country.flag,
          ...(officialName ? { fullName: officialName } : {}),
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
