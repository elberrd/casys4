"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField } from "@/lib/entity-view-helpers"
import { Globe } from "lucide-react"

interface CountryViewModalProps {
  countryId: Id<"countries">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function CountryViewModal({
  countryId,
  open,
  onOpenChange,
  onEdit,
}: CountryViewModalProps) {
  const t = useTranslations("Countries")
  const tCommon = useTranslations("Common")

  const country = useQuery(api.countries.get, { id: countryId })

  if (!country) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("countryDetails")}
        sections={[]}
        size="md"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("countryInformation"),
      icon: <Globe className="h-5 w-5" />,
      fields: [
        createField(t("name"), country.name),
      ],
    },
  ]

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("countryDetails")}
      sections={sections}
      onEdit={onEdit}
      size="md"
      entity={country}
    />
  )
}
