"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField, createBadgeField, createRelationshipField } from "@/lib/entity-view-helpers"
import { Users, Briefcase, Calendar } from "lucide-react"

interface PeopleCompanyViewModalProps {
  peopleCompanyId: Id<"peopleCompanies">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function PeopleCompanyViewModal({
  peopleCompanyId,
  open,
  onOpenChange,
  onEdit,
}: PeopleCompanyViewModalProps) {
  const t = useTranslations("PeopleCompanies")
  const tCommon = useTranslations("Common")

  const peopleCompany = useQuery(api.peopleCompanies.get, { id: peopleCompanyId })
  const person = peopleCompany?.personId
    ? useQuery(api.people.get, { id: peopleCompany.personId })
    : null
  const company = peopleCompany?.companyId
    ? useQuery(api.companies.get, { id: peopleCompany.companyId })
    : null

  if (!peopleCompany) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("relationshipDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("relationshipInformation"),
      icon: <Users className="h-5 w-5" />,
      fields: [
        createRelationshipField(t("person"), person, "fullName"),
        createRelationshipField(t("company"), company, "name"),
        createField(t("role"), peopleCompany.role),
      ],
    },
    {
      title: t("employmentPeriod"),
      icon: <Calendar className="h-5 w-5" />,
      fields: [
        createField(t("startDate"), peopleCompany.startDate, "date"),
        createField(t("endDate"), peopleCompany.endDate, "date"),
        createBadgeField(
          t("currentEmployment"),
          peopleCompany.isCurrent ? tCommon("yes") : tCommon("no"),
          peopleCompany.isCurrent ? "default" : "secondary"
        ),
      ],
    },
  ]

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("relationshipDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={peopleCompany}
    />
  )
}
