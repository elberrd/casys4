"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations, useLocale } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import { createField, createBadgeField } from "@/lib/entity-view-helpers"
import { FileText, Info, Link2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ENTITY_TYPE_LABELS, type EntityType } from "@/lib/field-registry"

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
  const locale = useLocale()

  const documentType = useQuery(api.documentTypes.get, { id: documentTypeId })
  const fieldMappings = useQuery(api.documentTypeFieldMappings.list, { documentTypeId })

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

  // Group field mappings by entity type
  const groupedMappings = (fieldMappings ?? []).reduce<Record<string, typeof fieldMappings>>((acc, mapping) => {
    if (!mapping) return acc
    const key = mapping.entityType
    if (!acc[key]) acc[key] = []
    acc[key]!.push(mapping)
    return acc
  }, {})

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("documentTypeDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={documentType}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t("fieldMappings")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fieldMappings && fieldMappings.length > 0 ? (
            <div className="space-y-3">
              {Object.entries(groupedMappings).map(([entityType, mappings]) => (
                <div key={entityType}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    {locale === "en"
                      ? ENTITY_TYPE_LABELS[entityType as EntityType]?.labelEn
                      : ENTITY_TYPE_LABELS[entityType as EntityType]?.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mappings!.map((mapping) => (
                      <Badge key={mapping._id} variant="outline" className="text-xs">
                        {locale === "en" ? (mapping.labelEn || mapping.label) : mapping.label}
                        {mapping.isRequired && (
                          <span className="text-destructive ml-0.5">*</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noLinkedFields")}</p>
          )}
        </CardContent>
      </Card>
    </EntityViewModal>
  )
}
