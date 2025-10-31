"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField } from "@/lib/entity-view-helpers"
import { Briefcase } from "lucide-react"

interface CBOCodeViewModalProps {
  cboCodeId: Id<"cboCodes">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function CBOCodeViewModal({
  cboCodeId,
  open,
  onOpenChange,
  onEdit,
}: CBOCodeViewModalProps) {
  const t = useTranslations("CboCodes")
  const tCommon = useTranslations("Common")

  const cboCode = useQuery(api.cboCodes.get, { id: cboCodeId })

  if (!cboCode) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("cboCodeDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("cboInformation"),
      icon: <Briefcase className="h-5 w-5" />,
      fields: [
        createField(t("code"), cboCode.code),
        createField(t("title"), cboCode.title),
        {
          label: t("description"),
          value: cboCode.description || "-",
          fullWidth: true,
        },
      ],
    },
  ]

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("cboCodeDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={cboCode}
    />
  )
}
