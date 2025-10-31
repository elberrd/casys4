"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField, createBadgeField } from "@/lib/entity-view-helpers"
import { FileText, Info } from "lucide-react"

interface DocumentTypeViewModalProps {
  documentTypeId: Id<"documentTypes">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function DocumentTypeViewModal({
  documentTypeId,
  open,
  onOpenChange,
  onEdit,
}: DocumentTypeViewModalProps) {
  const t = useTranslations("DocumentTypes")
  const tCommon = useTranslations("Common")

  const documentType = useQuery(api.documentTypes.get, { id: documentTypeId })

  if (!documentType) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("documentTypeDetails")}
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
      icon: <FileText className="h-5 w-5" />,
      fields: [
        createField(t("name"), documentType.name),
        createField(t("code"), documentType.code),
        createBadgeField(
          t("category"),
          documentType.category,
          "outline"
        ),
        createField(t("description"), documentType.description, undefined, {
          fullWidth: true,
        }),
        createBadgeField(
          t("status"),
          documentType.isActive ? tCommon("active") : tCommon("inactive"),
          documentType.isActive ? "default" : "secondary"
        ),
      ],
    },
  ]

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("documentTypeDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={documentType}
    />
  )
}
