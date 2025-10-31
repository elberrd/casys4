"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField } from "@/lib/entity-view-helpers"
import { Building2, MapPin, Mail, Phone, Globe } from "lucide-react"

interface ConsulateViewModalProps {
  consulateId: Id<"consulates">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function ConsulateViewModal({
  consulateId,
  open,
  onOpenChange,
  onEdit,
}: ConsulateViewModalProps) {
  const t = useTranslations("Consulates")
  const tCommon = useTranslations("Common")

  const consulate = useQuery(api.consulates.get, { id: consulateId })
  const city = useQuery(
    api.cities.get,
    consulate?.cityId ? { id: consulate.cityId } : "skip"
  )

  if (!consulate) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("consulateDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("basicInformation"),
      icon: <Building2 className="h-5 w-5" />,
      fields: [
        createField(t("name"), consulate.name),
        createField(
          t("city"),
          city?.name,
          undefined,
          {
            icon: <MapPin className="h-4 w-4" />
          }
        ),
      ],
    },
    {
      title: t("contactInformation"),
      icon: <Phone className="h-5 w-5" />,
      fields: [
        createField(
          t("address"),
          consulate.address,
          undefined,
          {
            icon: <MapPin className="h-4 w-4" />
          }
        ),
        createField(
          t("phoneNumber"),
          consulate.phoneNumber,
          "phone",
          {
            icon: <Phone className="h-4 w-4" />
          }
        ),
        createField(
          t("email"),
          consulate.email,
          "email",
          {
            icon: <Mail className="h-4 w-4" />
          }
        ),
        createField(
          t("website"),
          consulate.website,
          "url",
          {
            icon: <Globe className="h-4 w-4" />
          }
        ),
      ],
    },
  ]

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("consulateDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={consulate}
    />
  )
}
