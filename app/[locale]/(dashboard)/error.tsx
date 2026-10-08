"use client";

import { useParams } from "next/navigation";

import { TranslatedErrorFallback } from "@/components/translated-error-fallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  return (
    <TranslatedErrorFallback
      error={error}
      reset={reset}
      locale={params.locale}
    />
  );
}
