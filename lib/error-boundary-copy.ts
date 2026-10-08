export type ErrorBoundaryLocale = "pt" | "en";

export const ERROR_BOUNDARY_COPY: Record<
  ErrorBoundaryLocale,
  { title: string; description: string; retry: string }
> = {
  pt: {
    title: "Algo deu errado",
    description:
      "Ocorreu um erro ao carregar esta página. Você pode tentar novamente.",
    retry: "Tentar novamente",
  },
  en: {
    title: "Something went wrong",
    description: "An error occurred while loading this page. You can try again.",
    retry: "Try again",
  },
};

export function resolveErrorBoundaryLocale(
  locale?: string | null,
): ErrorBoundaryLocale {
  if (locale?.toLowerCase().startsWith("en")) return "en";
  if (locale?.toLowerCase().startsWith("pt")) return "pt";
  return "pt";
}
