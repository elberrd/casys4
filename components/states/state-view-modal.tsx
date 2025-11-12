"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { useCountryTranslation } from "@/lib/i18n/countries"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField } from "@/lib/entity-view-helpers"
import { MapPin } from "lucide-react"

interface StateViewModalProps {
  stateId: Id<"states">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function StateViewModal({
  stateId,
  open,
  onOpenChange,
  onEdit,
}: StateViewModalProps) {
  const t = useTranslations("States")
  const tCommon = useTranslations("Common")
  const getCountryName = useCountryTranslation()

  const state = useQuery(api.states.get, { id: stateId })
  const country = useQuery(
    api.countries.get,
    state?.countryId ? { id: state.countryId } : "skip"
  )

  if (!state) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("stateDetails")}
        sections={[]}
        size="md"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("stateInformation"),
      icon: <MapPin className="h-5 w-5" />,
      fields: [
        createField(t("name"), state.name),
        createField(t("code"), state.code),
        createField(t("country"), country ? (getCountryName(country.code) || country.name) : undefined),
      ],
    },
  ]

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("stateDetails")}
      sections={sections}
      onEdit={onEdit}
      size="md"
      entity={state}
    />
  )
}
