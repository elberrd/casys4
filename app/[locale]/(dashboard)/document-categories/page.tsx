import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { DocumentCategoriesClient } from "./document-categories-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DocumentCategories" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function DocumentCategoriesPage() {
  return <DocumentCategoriesClient />;
}
