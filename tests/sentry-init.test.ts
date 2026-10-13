import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildSentryInitOptions,
  canUploadSentrySourcemaps,
  shouldInitSentry,
} from "../lib/sentry-config";

test("missing DSN is a no-op: do not init Sentry", () => {
  assert.equal(shouldInitSentry(undefined), false);
  assert.equal(shouldInitSentry(""), false);
  assert.equal(shouldInitSentry("   "), false);
  assert.equal(buildSentryInitOptions({ dsn: undefined }), null);
  assert.equal(buildSentryInitOptions({ dsn: "" }), null);
});

test("present DSN builds options without PII or replay", () => {
  const options = buildSentryInitOptions({
    dsn: "https://public@o0.ingest.sentry.io/1",
    release: "abc123",
  });
  assert.ok(options);
  assert.equal(options.dsn, "https://public@o0.ingest.sentry.io/1");
  assert.equal(options.release, "abc123");
  assert.equal(options.sendDefaultPii, false);
  assert.equal(options.tracesSampleRate, 0);
  assert.equal("replaysSessionSampleRate" in options, false);
});

test("source maps upload only with token, org, and project", () => {
  assert.equal(canUploadSentrySourcemaps({}), false);
  assert.equal(
    canUploadSentrySourcemaps({ authToken: "t", org: "o" }),
    false,
  );
  assert.equal(
    canUploadSentrySourcemaps({
      authToken: "t",
      org: "o",
      project: "casys4",
    }),
    true,
  );
});

test("next.config uploads wider client maps and deletes them after upload", () => {
  const config = readFileSync(
    path.join(process.cwd(), "next.config.ts"),
    "utf8",
  );
  assert.match(config, /widenClientFileUpload:\s*true/);
  assert.match(config, /deleteSourcemapsAfterUpload:\s*true/);
});
