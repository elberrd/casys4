import { getTranslations } from "next-intl/server"
import type { Metadata } from "next"
import { CompanyGroupsClient } from "./company-groups-client"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "CompanyGroups" })

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function CompanyGroupsPage() {
  return <CompanyGroupsClient />
}
