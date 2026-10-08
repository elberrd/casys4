"use client";

import { ErrorFallback } from "@/components/error-fallback";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt">
      <body>
        <ErrorFallback error={error} reset={reset} locale="pt" />
      </body>
    </html>
  );
}
