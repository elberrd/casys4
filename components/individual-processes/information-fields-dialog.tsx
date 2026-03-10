"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { useTranslations } from "next-intl"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Save, FileText } from "lucide-react"
import { LinkedFieldInput } from "./linked-field-input"

interface InformationFieldsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  individualProcessId: Id<"individualProcesses">
  documentTypeId: Id<"documentTypes">
  documentRequirementId?: Id<"documentRequirements">
  documentTypeLegalFrameworkId?: Id<"documentTypesLegalFrameworks">
  documentTypeName: string
  onSuccess?: () => void
}

export function InformationFieldsDialog({
  open,
  onOpenChange,
  individualProcessId,
  documentTypeId,
  documentRequirementId,
  documentTypeLegalFrameworkId,
  documentTypeName,
  onSuccess,
}: InformationFieldsDialogProps) {
  const t = useTranslations("InformationFields")
  const tCommon = useTranslations("Common")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editedValues, setEditedValues] = useState<Record<string, string | number>>({})

  const fieldsWithValues = useQuery(
    api.documentTypeFieldMappings.getFieldsWithValues,
    open ? { documentTypeId, individualProcessId } : "skip"
  )

  const submitFields = useMutation(api.documentsDelivered.submitInformationFields)

  // Initialize edited values from current field values
  useEffect(() => {
    if (fieldsWithValues) {
      const initial: Record<string, string | number> = {}
      for (const field of fieldsWithValues) {
        const key = `${field.entityType}:${field.fieldPath}`
        initial[key] = field.currentValue ?? ""
      }
      setEditedValues(initial)
    }
  }, [fieldsWithValues])

  const handleFieldChange = (entityType: string, fieldPath: string, value: string | number) => {
    setEditedValues((prev) => ({
      ...prev,
      [`${entityType}:${fieldPath}`]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!fieldsWithValues) return

    setIsSubmitting(true)
    try {
      const changes = fieldsWithValues.map((field) => ({
        entityType: field.entityType,
        fieldPath: field.fieldPath,
        value: editedValues[`${field.entityType}:${field.fieldPath}`] ?? "",
      }))

      await submitFields({
        individualProcessId,
        documentTypeId,
        documentRequirementId,
        documentTypeLegalFrameworkId,
        changes,
      })

      toast.success(t("saved"))
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error submitting information fields:", error)
      toast.error(tCommon("error"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {documentTypeName}
          </DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
          {fieldsWithValues === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : fieldsWithValues.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noFields")}
            </p>
          ) : (
            fieldsWithValues.map((field) => {
              const key = `${field.entityType}:${field.fieldPath}`
              const value = editedValues[key] ?? ""
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">
                      {field.label}
                    </Label>
                    {field.isRequired && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        *
                      </Badge>
                    )}
                  </div>
                  <LinkedFieldInput
                    field={field}
                    value={value}
                    onChange={(val) => handleFieldChange(field.entityType, field.fieldPath, val)}
                  />
                </div>
              )
            })
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !fieldsWithValues || fieldsWithValues.length === 0}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
