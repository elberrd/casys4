import * as Sentry from "@sentry/nextjs";

import { initSentryFromEnv } from "./lib/sentry-runtime";

initSentryFromEnv();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
