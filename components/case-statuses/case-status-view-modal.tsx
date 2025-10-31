"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField, createBadgeField, createColorField } from "@/lib/entity-view-helpers"
import { Tag, Eye, List, ToggleLeft } from "lucide-react"

interface CaseStatusViewModalProps {
  caseStatusId: Id<"caseStatuses">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function CaseStatusViewModal({
  caseStatusId,
  open,
  onOpenChange,
  onEdit,
}: CaseStatusViewModalProps) {
  const t = useTranslations("CaseStatuses")
  const tCommon = useTranslations("Common")

  const caseStatus = useQuery(api.caseStatuses.get, { id: caseStatusId })

  if (!caseStatus) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("caseStatusDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("statusInformation"),
      icon: <Tag className="h-5 w-5" />,
      fields: [
        createField(t("name"), caseStatus.name),
        createField(t("nameEn"), caseStatus.nameEn),
        createField(t("code"), caseStatus.code),
        createBadgeField(t("category"), caseStatus.category, "outline"),
        createField(t("description"), caseStatus.description, undefined, {
          fullWidth: true,
        }),
      ],
    },
    {
      title: t("display"),
      icon: <Eye className="h-5 w-5" />,
      fields: [
        createColorField(t("color"), caseStatus.color),
        createField(t("sortOrder"), caseStatus.sortOrder?.toString()),
      ],
    },
    {
      title: t("state"),
      icon: <ToggleLeft className="h-5 w-5" />,
      fields: [
        createBadgeField(
          t("status"),
          caseStatus.isActive ? tCommon("active") : tCommon("inactive"),
          caseStatus.isActive ? "default" : "secondary"
        ),
        createField(t("createdAt"), caseStatus.createdAt, "datetime"),
        createField(t("updatedAt"), caseStatus.updatedAt, "datetime"),
      ],
    },
  ]

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("caseStatusDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={caseStatus}
    />
  )
}
