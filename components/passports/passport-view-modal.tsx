"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import {
  createField,
  createRelationshipField,
  createBadgeField,
} from "@/lib/entity-view-helpers"
import { FileText, User, Globe, Calendar, File } from "lucide-react"

interface PassportViewModalProps {
  passportId: Id<"passports">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function PassportViewModal({
  passportId,
  open,
  onOpenChange,
  onEdit,
}: PassportViewModalProps) {
  const t = useTranslations("Passports")
  const tCommon = useTranslations("Common")

  const passport = useQuery(api.passports.get, { id: passportId })

  if (!passport) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("passportDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  // Calculate expiry status
  const now = new Date()
  const expiryDate = passport.expiryDate ? new Date(passport.expiryDate) : null
  const daysUntilExpiry = expiryDate
    ? Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  let expiryStatus = tCommon("unknown")
  let expiryVariant: "default" | "secondary" | "destructive" = "secondary"

  if (daysUntilExpiry !== null) {
    if (daysUntilExpiry < 0) {
      expiryStatus = t("expired")
      expiryVariant = "destructive"
    } else if (daysUntilExpiry <= 90) {
      expiryStatus = t("expiringSoon")
      expiryVariant = "destructive"
    } else {
      expiryStatus = t("valid")
      expiryVariant = "default"
    }
  }

  const sections: ViewSection[] = [
    {
      title: t("passportInformation"),
      icon: <FileText className="h-5 w-5" />,
      fields: [
        createField(t("passportNumber"), passport.passportNumber),
        createRelationshipField(
          t("issuingCountry"),
          passport.issuingCountry,
          "name",
          {
            icon: <Globe className="h-4 w-4" />,
          }
        ),
        createField(t("issueDate"), passport.issueDate, "date", {
          icon: <Calendar className="h-4 w-4" />,
        }),
        createField(t("expiryDate"), passport.expiryDate, "date", {
          icon: <Calendar className="h-4 w-4" />,
        }),
      ],
    },
    {
      title: t("personInformation"),
      icon: <User className="h-5 w-5" />,
      fields: [
        createRelationshipField(
          t("person"),
          passport.person,
          "fullName",
          {
            icon: <User className="h-4 w-4" />,
          }
        ),
      ],
    },
    {
      title: t("status"),
      icon: <FileText className="h-5 w-5" />,
      fields: [
        createBadgeField(t("expiryStatus"), expiryStatus, expiryVariant),
        createBadgeField(
          t("isActive"),
          passport.isActive ? tCommon("active") : tCommon("inactive"),
          passport.isActive ? "default" : "secondary"
        ),
      ],
    },
  ]

  // Add document section if file URL exists
  if (passport.fileUrl) {
    sections.push({
      title: t("document"),
      icon: <File className="h-5 w-5" />,
      fields: [
        createField(t("documentFile"), passport.fileUrl, "url", {
          fullWidth: true,
        }),
      ],
    })
  }

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("passportDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={passport}
    />
  )
}
