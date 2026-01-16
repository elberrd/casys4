"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField, createBadgeField, createRelationshipField } from "@/lib/entity-view-helpers"
import { FileText, User, Building2, Upload, CheckCircle, FileIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface DocumentViewModalProps {
  documentId: Id<"documents">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function DocumentViewModal({
  documentId,
  open,
  onOpenChange,
  onEdit,
}: DocumentViewModalProps) {
  const t = useTranslations("Documents")
  const tCommon = useTranslations("Common")

  const document = useQuery(api.documents.get, { id: documentId })
  const documentType = useQuery(
    api.documentTypes.get,
    document?.documentTypeId ? { id: document.documentTypeId } : "skip"
  )
  const person = useQuery(
    api.people.get,
    document?.personId ? { id: document.personId } : "skip"
  )
  const company = useQuery(
    api.companies.get,
    document?.companyId ? { id: document.companyId } : "skip"
  )

  if (!document) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("documentDetails")}
        sections={[]}
        size="xl"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  const sections: ViewSection[] = [
    {
      title: t("documentInformation"),
      icon: <FileText className="h-5 w-5" />,
      fields: [
        createField(t("name"), document.name),
        createRelationshipField(t("type"), documentType),
        createField(t("fileName"), document.fileName),
        createField(
          t("fileSize"),
          document.fileSize
            ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB`
            : undefined
        ),
        createField(t("fileType"), document.fileType),
        createBadgeField(
          t("status"),
          document.isActive ? tCommon("active") : tCommon("inactive"),
          document.isActive ? "default" : "secondary"
        ),
        ...(document.fileUrl
          ? [
              {
                label: t("file"),
                value: (
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileIcon className="h-4 w-4" />
                    {t("downloadFile")}
                  </a>
                ),
                icon: <FileIcon className="h-4 w-4" />,
              },
            ]
          : []),
      ],
    },
  ]

  // Add Related Entities section if person or company exists
  if (person || company) {
    sections.push({
      title: t("relatedEntities"),
      icon: <User className="h-5 w-5" />,
      fields: [
        ...(person ? [createRelationshipField(t("person"), person, "fullName", { icon: <User className="h-4 w-4" /> })] : []),
        ...(company ? [createRelationshipField(t("company"), company, "name", { icon: <Building2 className="h-4 w-4" /> })] : []),
      ],
    })
  }

  // Add Dates section
  sections.push({
    title: t("dates"),
    icon: <Upload className="h-5 w-5" />,
    fields: [
      createField(t("issueDate"), document.issueDate, "date"),
      createField(t("expiryDate"), document.expiryDate, "date"),
      createField(t("createdAt"), document.createdAt, "datetime"),
      createField(t("updatedAt"), document.updatedAt, "datetime"),
    ],
  })

  // Add Notes section if notes exist
  if (document.notes) {
    sections.push({
      title: t("notes"),
      icon: <CheckCircle className="h-5 w-5" />,
      fields: [
        createField(t("notes"), document.notes, undefined, { fullWidth: true }),
      ],
    })
  }

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("documentDetails")}
      sections={sections}
      onEdit={onEdit}
      size="xl"
      entity={document}
    />
  )
}
