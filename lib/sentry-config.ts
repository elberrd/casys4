export type SentryInitOptions = {
  dsn: string;
  release?: string;
  sendDefaultPii: false;
  tracesSampleRate: number;
};

export function sentryDsnFromEnv(dsn: string | undefined): string | undefined {
  const trimmed = dsn?.trim();
  return trimmed ? trimmed : undefined;
}

export function shouldInitSentry(dsn: string | undefined): boolean {
  return sentryDsnFromEnv(dsn) !== undefined;
}

/**
 * Client/server Sentry options. Returns null when NEXT_PUBLIC_SENTRY_DSN is
 * missing so Sentry.init must not run and the app stays a no-op.
 */
export function buildSentryInitOptions(env: {
  dsn?: string;
  release?: string;
}): SentryInitOptions | null {
  const dsn = sentryDsnFromEnv(env.dsn);
  if (!dsn) return null;

  const release = env.release?.trim();
  return {
    dsn,
    ...(release ? { release } : {}),
    sendDefaultPii: false,
    tracesSampleRate: 0,
  };
}

export function canUploadSentrySourcemaps(env: {
  authToken?: string;
  org?: string;
  project?: string;
}): boolean {
  return Boolean(
    env.authToken?.trim() && env.org?.trim() && env.project?.trim(),
  );
}
