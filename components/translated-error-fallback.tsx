"use client";

import { useTranslations } from "next-intl";

import { ErrorFallback } from "@/components/error-fallback";

export function TranslatedErrorFallback({
  error,
  reset,
  locale,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  locale?: string;
}) {
  const t = useTranslations("ErrorBoundary");
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      locale={locale}
      title={t("title")}
      description={t("description")}
      retryLabel={t("retry")}
    />
  );
}
