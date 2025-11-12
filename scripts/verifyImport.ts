import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { config } from "dotenv";
import * as path from "path";

// Load environment variables
config({ path: path.join(__dirname, "../.env.local") });

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL environment variable is not set");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function verifyImport() {
  console.log("Verifying imported data...\n");

  try {
    // Get counts using Convex queries
    const people = await client.query(api.people.list, {});
    const passports = await client.query(api.passports.list, {});
    const cities = await client.query(api.cities.listWithRelations, {});

    console.log("=== IMPORT VERIFICATION ===\n");
    console.log(`✅ People imported: ${people.length}`);
    console.log(`✅ Passports created: ${passports.length}`);
    console.log(`✅ Cities in database: ${cities.length}`);

    // Sample some people to verify data quality
    console.log("\n=== SAMPLE DATA ===\n");

    const samples = people.slice(0, 5);
    for (const person of samples) {
      console.log(`Name: ${person.fullName}`);
      console.log(`  Email: ${person.email || "N/A"}`);
      console.log(`  CPF: ${person.cpf || "N/A"}`);
      console.log(`  Birth Date: ${person.birthDate || "N/A"}`);
      console.log(`  Nationality: ${person.nationalityId ? "✓" : "N/A"}`);
      console.log(`  Birth City: ${person.birthCityId ? "✓" : "N/A"}`);
      console.log(`  Marital Status: ${person.maritalStatus || "N/A"}`);
      console.log("");
    }

    console.log("✅ Import verification complete!");

  } catch (error) {
    console.error("\n❌ Verification failed:");
    console.error(error);
    process.exit(1);
  }
}

verifyImport()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
