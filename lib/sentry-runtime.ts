import * as Sentry from "@sentry/nextjs";

import { buildSentryInitOptions } from "./sentry-config";

export function initSentryFromEnv(): boolean {
  const options = buildSentryInitOptions({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    release:
      process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
      process.env.VERCEL_GIT_COMMIT_SHA,
  });
  if (!options) {
    return false;
  }
  Sentry.init(options);
  return true;
}
