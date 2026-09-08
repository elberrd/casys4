import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ReportTemplatesClient } from "./report-templates-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ReportTemplates" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function ReportTemplatesPage() {
  return <ReportTemplatesClient />;
}
