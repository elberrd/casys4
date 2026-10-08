"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";
import {
  clearChunkLoadReloadFlag,
  isChunkLoadError,
  shouldReloadOnceForChunkError,
} from "@/lib/chunk-load-error";
import {
  ERROR_BOUNDARY_COPY,
  resolveErrorBoundaryLocale,
} from "@/lib/error-boundary-copy";

export function ErrorFallback({
  error,
  reset,
  locale,
  title,
  description,
  retryLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  locale?: string;
  title?: string;
  description?: string;
  retryLabel?: string;
}) {
  const copy = ERROR_BOUNDARY_COPY[resolveErrorBoundaryLocale(locale)];
  const heading = title ?? copy.title;
  const body = description ?? copy.description;
  const retry = retryLabel ?? copy.retry;

  useEffect(() => {
    Sentry.captureException(error);
    if (typeof window === "undefined") return;
    if (isChunkLoadError(error)) {
      if (shouldReloadOnceForChunkError(window.sessionStorage)) {
        window.location.reload();
      }
      return;
    }
    clearChunkLoadReloadFlag(window.sessionStorage);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{heading}</h1>
      <p className="text-muted-foreground max-w-md">{body}</p>
      <Button type="button" onClick={reset}>
        {retry}
      </Button>
    </div>
  );
}
