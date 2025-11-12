/**
 * Seed script to populate companies from CSV data
 * This is an internal mutation that bypasses authentication
 *
 * To run this script:
 * npx convex run seedCompanies
 */

import { internalMutation } from "./_generated/server";

// Company data from CSV
const companies = [
  {
    name: "CLADTEK DO BRASIL INDÚSTRIA E COMÉRCIO DE TUBOS E REVESTIMENTOS LTDA",
    website: "https://cladtek.com",
    taxId: undefined,
  },
  {
    name: "CADDELL CONSTRUCTION CO. (DE), LLC.",
    website: "https://caddell.com/",
    taxId: "48.059.363/0001-29",
  },
  {
    name: "PAN MARINE DO BRASIL LTDA.",
    website: undefined,
    taxId: "42.519.082/0001-25",
  },
  {
    name: "SWIFT TECHNICAL SERVIÇOS TÉCNICOS ESPECIALIZADOS LTDA.",
    website: undefined,
    taxId: "07.907.688/0001-37",
  },
  {
    name: "CADDELL CONSTRUCTION CO. (DE), LLC.",
    website: undefined,
    taxId: "48.059.363/0002-00",
  },
  {
    name: "SPE TRANSMISSORA DE ENERGIA LINHA VERDE I S/A",
    website: undefined,
    taxId: "29.568.539/0001-23",
  },
  {
    name: "MITSUI GÁS E ENERGIA DO BRASIL LTDA.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "SINOCHEM PETRÓLEO BRASIL LTDA.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "TTL SUBSEA",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "PETRO RIO JAGUAR PETROLEO S.A.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "Empresa teste",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "MARITIME DEVELOPMENTS BRASIL LTDA.",
    website: undefined,
    taxId: "50.181.319/0001-39",
  },
  {
    name: "ITALSOFA NORDESTE S.A.",
    website: undefined,
    taxId: "03.636.350/0001-37",
  },
  {
    name: "DRILLTEC SERVIÇOS DE PERFURAÇÃO LTDA.",
    website: undefined,
    taxId: "15.069.951/0001-94",
  },
  {
    name: "GEOMIT PARTICIPAÇÕES S.A.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "DRAMMEN YARD",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "NORGÁS S.A.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "SEACREST PETRÓLEO S.A.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "W-INDUSTRIES",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "SIMTECH REPRESENTAÇÕES LTDA.",
    website: "https://simtech.com.br/pt/",
    taxId: "40.190.753/0001-21",
  },
  {
    name: "EPPEI BRASIL TECNOLOGIA EM ENERGIA ELÉTRICA LTDA.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "HEINRICH-BOLL-STIFTUNG",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "TACKER BR LTDA.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "ENKA",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "TENNESSINE INSTRUMENTAÇÃO ANALÍTICA COMÉRCIO E SERVIÇOS LTDA.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "IEC INSTALAÇÕES E ENGENHARIA DE CORROSÃO LTDA.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "SINOPEC PETROLEUM DO BRASIL LTDA.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "IC SUPPLY ENGENHARIA LTDA.",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "CONSÓRCIO KPS IC SUPPLY",
    website: undefined,
    taxId: undefined,
  },
  {
    name: "AGROVALE GEOMIT BIOGAS LTDA.",
    website: undefined,
    taxId: undefined,
  },
];

export default internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log(`Starting to seed ${companies.length} companies...`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    const now = Date.now();

    for (const company of companies) {
      // Check if company already exists by name or taxId
      let existing = null;

      // First try to find by taxId if it exists
      if (company.taxId) {
        existing = await ctx.db
          .query("companies")
          .withIndex("by_taxId", (q) => q.eq("taxId", company.taxId))
          .first();
      }

      // If not found by taxId, try by name
      if (!existing) {
        existing = await ctx.db
          .query("companies")
          .filter((q) => q.eq(q.field("name"), company.name))
          .first();
      }

      if (existing) {
        // Update existing company if new data is available
        const needsUpdate =
          (company.website && !existing.website) ||
          (company.taxId && !existing.taxId);

        if (needsUpdate) {
          await ctx.db.patch(existing._id, {
            website: company.website || existing.website,
            taxId: company.taxId || existing.taxId,
            updatedAt: now,
          });
          updated++;
          console.log(`Updated: ${company.name}`);
        } else {
          skipped++;
          console.log(`Skipped (already exists): ${company.name}`);
        }
      } else {
        // Create new company
        await ctx.db.insert("companies", {
          name: company.name,
          taxId: company.taxId,
          website: company.website,
          address: undefined,
          cityId: undefined,
          phoneNumber: undefined,
          email: undefined,
          contactPersonId: undefined,
          isActive: true,
          notes: undefined,
          createdAt: now,
          updatedAt: now,
        });
        created++;
        console.log(`Created: ${company.name}`);
      }
    }

    const summary = {
      total: companies.length,
      created,
      updated,
      skipped,
    };

    console.log("Seed complete:", summary);
    return summary;
  },
});
