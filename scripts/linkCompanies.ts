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

async function linkCompanies() {
  console.log("Linking people to companies...\n");

  try {
    const result = await client.mutation(api.migrations.linkPeopleToCompanies.default, {});

    console.log("\n=== COMPANY LINKS REPORT ===\n");
    console.log(`✅ Successfully linked: ${result.linked}`);
    console.log(`❌ Errors: ${result.errors}`);

    if (result.errorDetails.length > 0) {
      console.log("\nError details:");
      result.errorDetails.forEach((error: any) => {
        console.log(`  - ${error.name}: ${error.error}`);
      });
    }

    console.log("\n✅ Company links completed!");

  } catch (error) {
    console.error("\n❌ Linking failed:");
    console.error(error);
    process.exit(1);
  }
}

linkCompanies()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
