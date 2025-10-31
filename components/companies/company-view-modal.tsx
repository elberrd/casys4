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
import { Building2, Mail, Phone, MapPin, User, Globe, FileText } from "lucide-react"

interface CompanyViewModalProps {
  companyId: Id<"companies">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function CompanyViewModal({
  companyId,
  open,
  onOpenChange,
  onEdit,
}: CompanyViewModalProps) {
  const t = useTranslations("Companies")
  const tCommon = useTranslations("Common")

  const company = useQuery(api.companies.get, { id: companyId })

  if (!company) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("companyDetails")}
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
        createField(t("name"), company.name),
        createField(t("taxId"), company.taxId || "-"),
        createField(t("website"), company.website, "url", {
          icon: <Globe className="h-4 w-4" />,
        }),
        createBadgeField(
          t("isActive"),
          company.isActive ? tCommon("active") : tCommon("inactive"),
          company.isActive ? "default" : "secondary"
        ),
      ],
    },
    {
      title: t("contactInformation"),
      icon: <Mail className="h-5 w-5" />,
      fields: [
        createField(t("email"), company.email, "email", {
          icon: <Mail className="h-4 w-4" />,
        }),
        createField(t("phoneNumber"), company.phoneNumber, "phone", {
          icon: <Phone className="h-4 w-4" />,
        }),
        createField(t("address"), company.address || "-", undefined, {
          fullWidth: true,
          icon: <MapPin className="h-4 w-4" />,
        }),
        createRelationshipField(
          t("city"),
          company.city,
          "name",
          {
            icon: <MapPin className="h-4 w-4" />,
          }
        ),
      ],
    },
  ]

  // Add contact person section if exists
  if (company.contactPerson) {
    sections.push({
      title: t("contactPerson"),
      icon: <User className="h-5 w-5" />,
      fields: [
        createRelationshipField(
          t("contactPersonName"),
          company.contactPerson,
          "fullName",
          {
            icon: <User className="h-4 w-4" />,
          }
        ),
      ],
    })
  }

  // Add notes section if exists
  if (company.notes) {
    sections.push({
      title: t("notes"),
      icon: <FileText className="h-5 w-5" />,
      fields: [
        createField(t("notes"), company.notes, undefined, {
          fullWidth: true,
        }),
      ],
    })
  }

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("companyDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={company}
    />
  )
}
