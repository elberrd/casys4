import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: path.join(__dirname, "../.env.local") });

// Get Convex deployment URL from environment or use default
const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL environment variable is not set");
  console.error("Please set it in your .env.local file");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function importPeople(dryRun: boolean = false) {
  console.log(`Starting import ${dryRun ? "(DRY RUN)" : "(LIVE)"}...`);

  // Read CSV file
  const csvPath = path.join(__dirname, "../ai_docs/database/people.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");

  console.log(`CSV file loaded: ${csvPath}`);
  console.log(`File size: ${(csvContent.length / 1024).toFixed(2)} KB`);

  try {
    const result = await client.mutation(api.migrations.importPeopleCsv.default, {
      csvContent,
      dryRun,
    });

    console.log("\n=== IMPORT REPORT ===\n");
    console.log("Summary:");
    console.log(`  Total rows processed: ${result.summary.totalRows}`);
    console.log(`  People created: ${result.summary.peopleCreated}`);
    console.log(`  Cities created: ${result.summary.citiesCreated}`);
    console.log(`  Passports created: ${result.summary.passportsCreated}`);
    console.log(`  Company links created: ${result.summary.companyLinksCreated}`);

    console.log("\nSkipped:");
    console.log(`  Test data: ${result.skipped.testData}`);
    console.log(`  Duplicate CPF: ${result.skipped.duplicateCPF}`);
    console.log(`  Invalid data: ${result.skipped.invalidData}`);

    if (result.warnings.unmappedNationalities.length > 0) {
      console.log("\n⚠️  Unmapped Nationalities (set to null):");
      result.warnings.unmappedNationalities.forEach((nat: string) => {
        console.log(`  - ${nat}`);
      });
    }

    if (result.warnings.unmappedCompanies.length > 0) {
      console.log("\n⚠️  Unmapped Companies (links skipped):");
      result.warnings.unmappedCompanies.forEach((company: string) => {
        console.log(`  - ${company}`);
      });
    }

    if (result.errors.length > 0) {
      console.log("\n❌ Errors:");
      result.errors.forEach((error: any) => {
        console.log(`  Row ${error.row} (${error.name}): ${error.error}`);
      });
    }

    if (dryRun) {
      console.log("\n✨ This was a DRY RUN. No data was actually imported.");
      console.log("Run without --dry-run flag to perform the actual import.");
    } else {
      console.log("\n✅ Import completed successfully!");
    }

  } catch (error) {
    console.error("\n❌ Import failed:");
    console.error(error);
    process.exit(1);
  }
}

// Check for dry-run flag
const isDryRun = process.argv.includes("--dry-run");

importPeople(isDryRun)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
