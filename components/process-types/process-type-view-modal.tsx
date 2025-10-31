"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField, createBadgeField } from "@/lib/entity-view-helpers"
import { FileType, Info, Clock } from "lucide-react"

interface ProcessTypeViewModalProps {
  processTypeId: Id<"processTypes">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function ProcessTypeViewModal({
  processTypeId,
  open,
  onOpenChange,
  onEdit,
}: ProcessTypeViewModalProps) {
  const t = useTranslations("ProcessTypes")
  const tCommon = useTranslations("Common")

  const processType = useQuery(api.processTypes.get, { id: processTypeId })

  if (!processType) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("processTypeDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("typeInformation"),
      icon: <FileType className="h-5 w-5" />,
      fields: [
        createField(t("name"), processType.name),
        createField(t("description"), processType.description, undefined, {
          fullWidth: true,
        }),
      ],
    },
    {
      title: t("details"),
      icon: <Info className="h-5 w-5" />,
      fields: [
        createField(
          t("estimatedDays"),
          processType.estimatedDays
            ? `${processType.estimatedDays} ${tCommon("days")}`
            : undefined,
          undefined,
          { icon: <Clock className="h-4 w-4" /> }
        ),
        createBadgeField(
          t("status"),
          processType.isActive ? tCommon("active") : tCommon("inactive"),
          processType.isActive ? "default" : "secondary"
        ),
      ],
    },
  ]

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("processTypeDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={processType}
    />
  )
}
