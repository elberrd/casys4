"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField } from "@/lib/entity-view-helpers"
import { Scale, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface LegalFrameworkViewModalProps {
  legalFrameworkId: Id<"legalFrameworks">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function LegalFrameworkViewModal({
  legalFrameworkId,
  open,
  onOpenChange,
  onEdit,
}: LegalFrameworkViewModalProps) {
  const t = useTranslations("LegalFrameworks")
  const tCommon = useTranslations("Common")

  const legalFramework = useQuery(api.legalFrameworks.get, { id: legalFrameworkId })
  const processType = useQuery(
    api.processTypes.get,
    legalFramework?.processTypeId ? { id: legalFramework.processTypeId } : "skip"
  )

  if (!legalFramework) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("legalFrameworkDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("frameworkInformation"),
      icon: <Scale className="h-5 w-5" />,
      fields: [
        createField(t("name"), legalFramework.name, undefined, { fullWidth: true }),
        createField(t("processType"), processType?.name, undefined, { fullWidth: true }),
        createField(
          t("status"),
          legalFramework.isActive ? (
            <Badge variant="default" className="bg-green-600">
              {tCommon("active")}
            </Badge>
          ) : (
            <Badge variant="secondary">{tCommon("inactive")}</Badge>
          )
        ),
        {
          label: t("description"),
          value: legalFramework.description || "-",
          fullWidth: true,
          icon: <FileText className="h-4 w-4" />,
        },
      ],
    },
  ]

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("legalFrameworkDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={legalFramework}
    />
  )
}
