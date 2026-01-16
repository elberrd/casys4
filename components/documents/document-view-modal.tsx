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
  documentId: Id<"documents"> | Id<"documentsDelivered">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
  isDeliveredDocument?: boolean
}

export function DocumentViewModal({
  documentId,
  open,
  onOpenChange,
  onEdit,
  isDeliveredDocument = false,
}: DocumentViewModalProps) {
  const t = useTranslations("Documents")
  const tCommon = useTranslations("Common")

  // Query for standalone documents
  const standaloneDocument = useQuery(
    api.documents.get,
    !isDeliveredDocument ? { id: documentId as Id<"documents"> } : "skip"
  )

  // Query for delivered documents
  const deliveredDocument = useQuery(
    api.documentsDelivered.get,
    isDeliveredDocument ? { id: documentId as Id<"documentsDelivered"> } : "skip"
  )

  // Use the appropriate document
  const document = isDeliveredDocument ? deliveredDocument : standaloneDocument

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
    !isDeliveredDocument && (standaloneDocument as typeof standaloneDocument)?.companyId
      ? { id: (standaloneDocument as typeof standaloneDocument)!.companyId! }
      : "skip"
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

  // Build sections based on document type
  const sections: ViewSection[] = []

  if (isDeliveredDocument && deliveredDocument) {
    // Sections for delivered documents
    const statusLabels: Record<string, string> = {
      uploaded: t("status.uploaded") || "Enviado",
      approved: t("status.approved") || "Aprovado",
      rejected: t("status.rejected") || "Rejeitado",
      under_review: t("status.underReview") || "Em Análise",
    }

    sections.push({
      title: t("documentInformation"),
      icon: <FileText className="h-5 w-5" />,
      fields: [
        createField(t("fileName"), deliveredDocument.fileName),
        createRelationshipField(t("type"), documentType),
        createField(
          t("fileSize"),
          deliveredDocument.fileSize
            ? `${(deliveredDocument.fileSize / 1024 / 1024).toFixed(2)} MB`
            : undefined
        ),
        createField(t("fileType"), deliveredDocument.mimeType),
        createBadgeField(
          t("status"),
          statusLabels[deliveredDocument.status] || deliveredDocument.status,
          deliveredDocument.status === "approved"
            ? "default"
            : deliveredDocument.status === "rejected"
            ? "destructive"
            : "secondary"
        ),
        ...(deliveredDocument.fileUrl
          ? [
              {
                label: t("file"),
                value: (
                  <a
                    href={deliveredDocument.fileUrl}
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
    })

    // Add Related Entities section
    if (person) {
      sections.push({
        title: t("relatedEntities"),
        icon: <User className="h-5 w-5" />,
        fields: [
          createRelationshipField(t("person"), person, "fullName", { icon: <User className="h-4 w-4" /> }),
        ],
      })
    }

    // Add Dates section
    sections.push({
      title: t("dates"),
      icon: <Upload className="h-5 w-5" />,
      fields: [
        createField(t("uploadedAt") || "Enviado em", deliveredDocument.uploadedAt, "datetime"),
        ...(deliveredDocument.reviewedAt
          ? [createField(t("reviewedAt") || "Revisado em", deliveredDocument.reviewedAt, "datetime")]
          : []),
      ],
    })

    // Add rejection reason if rejected
    if (deliveredDocument.status === "rejected" && deliveredDocument.rejectionReason) {
      sections.push({
        title: t("rejectionReason") || "Motivo da Rejeição",
        icon: <CheckCircle className="h-5 w-5" />,
        fields: [
          createField(t("notes"), deliveredDocument.rejectionReason, undefined, { fullWidth: true }),
        ],
      })
    }
  } else if (standaloneDocument) {
    // Sections for standalone documents
    sections.push({
      title: t("documentInformation"),
      icon: <FileText className="h-5 w-5" />,
      fields: [
        createField(t("name"), standaloneDocument.name),
        createRelationshipField(t("type"), documentType),
        createField(t("fileName"), standaloneDocument.fileName),
        createField(
          t("fileSize"),
          standaloneDocument.fileSize
            ? `${(standaloneDocument.fileSize / 1024 / 1024).toFixed(2)} MB`
            : undefined
        ),
        createField(t("fileType"), standaloneDocument.fileType),
        createBadgeField(
          t("status"),
          standaloneDocument.isActive ? tCommon("active") : tCommon("inactive"),
          standaloneDocument.isActive ? "default" : "secondary"
        ),
        ...(standaloneDocument.fileUrl
          ? [
              {
                label: t("file"),
                value: (
                  <a
                    href={standaloneDocument.fileUrl}
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
    })

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
        createField(t("issueDate"), standaloneDocument.issueDate, "date"),
        createField(t("expiryDate"), standaloneDocument.expiryDate, "date"),
        createField(t("createdAt"), standaloneDocument.createdAt, "datetime"),
        createField(t("updatedAt"), standaloneDocument.updatedAt, "datetime"),
      ],
    })

    // Add Notes section if notes exist
    if (standaloneDocument.notes) {
      sections.push({
        title: t("notes"),
        icon: <CheckCircle className="h-5 w-5" />,
        fields: [
          createField(t("notes"), standaloneDocument.notes, undefined, { fullWidth: true }),
        ],
      })
    }
  }

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("documentDetails")}
      sections={sections}
      onEdit={!isDeliveredDocument ? onEdit : undefined}
      size="xl"
      entity={document}
    />
  )
}
