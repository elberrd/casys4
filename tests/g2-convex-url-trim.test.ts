import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { convexUrlFromEnv } from "../lib/convex-url";

test("convex URL trims wrapping whitespace and newlines", () => {
  assert.equal(
    convexUrlFromEnv("https://example.convex.cloud\n"),
    "https://example.convex.cloud",
  );
  assert.equal(
    convexUrlFromEnv("  https://example.convex.cloud  "),
    "https://example.convex.cloud",
  );
  assert.equal(convexUrlFromEnv(undefined), "");
});

test("ConvexClientProvider uses convexUrlFromEnv", () => {
  const provider = readFileSync(
    path.join(process.cwd(), "components/ConvexClientProvider.tsx"),
    "utf8",
  );
  assert.match(
    provider,
    /convexUrlFromEnv\(process\.env\.NEXT_PUBLIC_CONVEX_URL\)/,
  );
  assert.doesNotMatch(
    provider,
    /new ConvexReactClient\(process\.env\.NEXT_PUBLIC_CONVEX_URL!\)/,
  );
});
