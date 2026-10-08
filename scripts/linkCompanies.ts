async function linkCompanies() {
  throw new Error(
    "linkPeopleToCompanies is an internalMutation. Run with deploy access: pnpm exec convex run migrations/linkPeopleToCompanies",
  );
}

linkCompanies()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
