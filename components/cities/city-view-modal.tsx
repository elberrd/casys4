"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { useCountryTranslation } from "@/lib/i18n/countries"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField } from "@/lib/entity-view-helpers"
import { Building2, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CityViewModalProps {
  cityId: Id<"cities">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function CityViewModal({
  cityId,
  open,
  onOpenChange,
  onEdit,
}: CityViewModalProps) {
  const t = useTranslations("Cities")
  const tCommon = useTranslations("Common")
  const getCountryName = useCountryTranslation()

  const city = useQuery(api.cities.get, { id: cityId })
  const state = useQuery(
    api.states.get,
    city?.stateId ? { id: city.stateId } : "skip"
  )
  const country = useQuery(
    api.countries.get,
    state?.countryId ? { id: state.countryId } : "skip"
  )

  if (!city) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("cityDetails")}
        sections={[]}
        size="md"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("cityInformation"),
      icon: <Building2 className="h-5 w-5" />,
      fields: [
        createField(t("name"), city.name),
        createField(t("state"), state?.name),
        createField(t("country"), country ? (getCountryName(country.code) || country.name) : undefined),
        createField(
          t("hasFederalPolice"),
          city.hasFederalPolice ? (
            <Badge variant="default" className="bg-green-600">
              <Shield className="h-3 w-3 mr-1" />
              {tCommon("yes")}
            </Badge>
          ) : (
            <Badge variant="secondary">{tCommon("no")}</Badge>
          )
        ),
      ],
    },
  ]

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("cityDetails")}
      sections={sections}
      onEdit={onEdit}
      size="md"
      entity={city}
    />
  )
}
