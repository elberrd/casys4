import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: path.join(__dirname, "../.env.local") });

async function importPeople(dryRun: boolean = false) {
  console.log(`Starting import ${dryRun ? "(DRY RUN)" : "(LIVE)"}...`);

  const csvPath = path.join(__dirname, "../ai_docs/database/people.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");

  console.log(`CSV file loaded: ${csvPath}`);
  console.log(`File size: ${(csvContent.length / 1024).toFixed(2)} KB`);
  console.log(`Rows will not be sent over the public API (${csvContent.length} chars).`);

  throw new Error(
    "importPeopleCsv is an internalMutation. Run with deploy access: pnpm exec convex run migrations/importPeopleCsv",
  );
}

const isDryRun = process.argv.includes("--dry-run");

importPeople(isDryRun)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
