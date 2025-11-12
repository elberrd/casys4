/**
 * Internal query to verify companies were inserted
 *
 * To run this script:
 * npx convex run verifyCompanies
 */

import { internalQuery } from "./_generated/server";

export default internalQuery({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();

    console.log(`\nTotal companies in database: ${companies.length}`);
    console.log("\nCompanies list:");
    console.log("================");

    companies.forEach((company, index) => {
      console.log(`\n${index + 1}. ${company.name}`);
      if (company.taxId) console.log(`   CNPJ: ${company.taxId}`);
      if (company.website) console.log(`   Website: ${company.website}`);
      console.log(`   Active: ${company.isActive}`);
    });

    return {
      total: companies.length,
      companies: companies.map(c => ({
        name: c.name,
        taxId: c.taxId,
        website: c.website,
        isActive: c.isActive,
      })),
    };
  },
});
