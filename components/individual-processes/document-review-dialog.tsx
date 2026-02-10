"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  Download,
  History,
  Upload,
  Clock,
  ArrowRight,
  RotateCcw,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ListChecks,
  Save,
  Pencil,
  Info,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileViewer } from "@/components/ui/file-viewer"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { UploadNewVersionDialog } from "@/components/individual-processes/upload-new-version-dialog"

const MARITAL_STATUS_OPTIONS = [
  { value: "Single", label: "Solteiro(a)", labelEn: "Single" },
  { value: "Married", label: "Casado(a)", labelEn: "Married" },
  { value: "Divorced", label: "Divorciado(a)", labelEn: "Divorced" },
  { value: "Widowed", label: "Viúvo(a)", labelEn: "Widowed" },
]

const QUALIFICATION_OPTIONS = [
  { value: "medio", label: "Médio", labelEn: "High School" },
  { value: "tecnico", label: "Técnico", labelEn: "Technical" },
  { value: "superior", label: "Superior", labelEn: "College" },
  { value: "naoPossui", label: "Não possui", labelEn: "None" },
]

/** Inline input component for editing linked field values */
function LinkedFieldInput({
  field,
  value,
  onChange,
}: {
  field: { fieldType: string; fieldPath: string; entityType: string }
  value: string | number
  onChange: (val: string | number) => void
}) {
  // Select fields
  if (field.fieldPath === "maritalStatus") {
    return (
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MARITAL_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.fieldPath === "qualification") {
    return (
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {QUALIFICATION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // Date fields
  if (field.fieldType === "date") {
    return (
      <Input
        type="date"
        className="h-8 text-xs"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  // Number fields
  if (field.fieldType === "number") {
    return (
      <Input
        type="number"
        className="h-8 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        step="0.01"
      />
    )
  }

  // Default: text input
  return (
    <Input
      type="text"
      className="h-8 text-xs"
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

interface DocumentReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: Id<"documentsDelivered"> | null
  onSuccess?: () => void
}

export function DocumentReviewDialog({
  open,
  onOpenChange,
  documentId,
  onSuccess,
}: DocumentReviewDialogProps) {
  const t = useTranslations("DocumentReview")
  const tCommon = useTranslations("Common")

  const [rejectionReason, setRejectionReason] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showStatusActions, setShowStatusActions] = useState(false)
  const [isEditingFields, setIsEditingFields] = useState(false)
  const [isSavingFields, setIsSavingFields] = useState(false)
  const [editedValues, setEditedValues] = useState<Record<string, string | number>>({})
  const [selectedVersionId, setSelectedVersionId] = useState<Id<"documentsDelivered"> | null>(null)
  const [showUploadNewVersion, setShowUploadNewVersion] = useState(false)

  const document = useQuery(
    api.documentsDelivered.get,
    documentId ? { id: documentId } : "skip"
  )

  const versionHistory = useQuery(
    api.documentsDelivered.getVersionHistory,
    document && document.documentTypeId
      ? {
          individualProcessId: document.individualProcessId,
          documentTypeId: document.documentTypeId,
          documentRequirementId: document.documentRequirementId,
        }
      : "skip"
  )

  const statusHistory = useQuery(
    api.documentsDelivered.getStatusHistory,
    documentId ? { documentId } : "skip"
  )

  const conditions = useQuery(
    api.documentDeliveredConditions.listByDocument,
    documentId ? { documentsDeliveredId: documentId } : "skip"
  )

  const validationStatus = useQuery(
    api.documentDeliveredConditions.getValidationStatus,
    documentId ? { documentsDeliveredId: documentId } : "skip"
  )

  const linkedFields = useQuery(
    api.documentTypeFieldMappings.getFieldsWithValues,
    document?.documentTypeId && document?.individualProcessId
      ? {
          documentTypeId: document.documentTypeId,
          individualProcessId: document.individualProcessId,
        }
      : "skip"
  )

  const approve = useMutation(api.documentsDelivered.approve)
  const toggleConditionFulfillment = useMutation(api.documentDeliveredConditions.toggleFulfillment)
  const reject = useMutation(api.documentsDelivered.reject)
  const changeStatus = useMutation(api.documentsDelivered.changeStatus)
  const updateFieldValues = useMutation(api.documentTypeFieldMappings.updateFieldValues)

  // Reset editing state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setIsEditingFields(false)
      setEditedValues({})
      setSelectedVersionId(null)
      setShowUploadNewVersion(false)
    }
  }, [open])

  // Derive the document to display based on selected version
  const latestVersion = versionHistory?.find((v) => v.isLatest)
  const selectedVersion = selectedVersionId
    ? versionHistory?.find((v) => v._id === selectedVersionId) ?? null
    : null
  // When no version is explicitly selected, prefer the latest from history (handles new uploads)
  const displayDocument = selectedVersion || latestVersion || document
  const isViewingOldVersion = !!(selectedVersion && !selectedVersion.isLatest)

  const getEditKey = (entityType: string, fieldPath: string) => `${entityType}:${fieldPath}`

  const getFieldDisplayValue = useCallback((field: { entityType: string; fieldPath: string; currentValue: any; isFilled: boolean }) => {
    const key = getEditKey(field.entityType, field.fieldPath)
    if (key in editedValues) return editedValues[key]
    return field.currentValue ?? ""
  }, [editedValues])

  const handleFieldChange = (entityType: string, fieldPath: string, value: string | number) => {
    setEditedValues((prev) => ({
      ...prev,
      [getEditKey(entityType, fieldPath)]: value,
    }))
  }

  const handleSaveFields = async () => {
    if (!document?.individualProcessId || Object.keys(editedValues).length === 0) return

    try {
      setIsSavingFields(true)
      const changes = Object.entries(editedValues).map(([key, value]) => {
        const [entityType, fieldPath] = key.split(":")
        return { entityType, fieldPath, value }
      })

      await updateFieldValues({
        individualProcessId: document.individualProcessId,
        changes,
      })

      toast.success(t("fieldsSaved") || "Campos salvos com sucesso")
      setEditedValues({})
      setIsEditingFields(false)
    } catch (error) {
      console.error("Error saving fields:", error)
      toast.error(t("fieldsSaveError") || "Erro ao salvar campos")
    } finally {
      setIsSavingFields(false)
    }
  }

  const handleApprove = async () => {
    if (!documentId) return

    // Check conditions before approval
    if (validationStatus) {
      if (!validationStatus.allRequiredFulfilled) {
        toast.error(t("errorConditionsNotFulfilled") || `Não é possível aprovar: condições obrigatórias não cumpridas: ${validationStatus.unfulfilledRequired.join(", ")}`)
        return
      }
      if (validationStatus.hasExpiredConditions) {
        toast.error(t("errorConditionsExpired") || `Não é possível aprovar: condições expiradas: ${validationStatus.expiredConditions.join(", ")}`)
        return
      }
    }

    try {
      setIsApproving(true)

      await approve({ id: documentId })

      toast.success(t("approveSuccess"))
      setShowStatusActions(false)
      setRejectionReason("")

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error approving document:", error)
      const errorMessage = error instanceof Error ? error.message : ""
      if (errorMessage.includes("Required conditions not fulfilled")) {
        toast.error(t("errorConditionsNotFulfilled") || errorMessage)
      } else if (errorMessage.includes("conditions have expired")) {
        toast.error(t("errorConditionsExpired") || errorMessage)
      } else if (errorMessage.includes("Document validity") || errorMessage.includes("validity check")) {
        toast.error(t("errorValidityFailed") || errorMessage)
      } else {
        toast.error(t("errorApprove"))
      }
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!documentId) return

    if (!rejectionReason.trim()) {
      toast.error(t("errorNoReason"))
      return
    }

    try {
      setIsRejecting(true)

      await reject({
        id: documentId,
        rejectionReason: rejectionReason.trim(),
      })

      toast.success(t("rejectSuccess"))
      setShowStatusActions(false)
      setRejectionReason("")

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error rejecting document:", error)
      toast.error(t("errorReject"))
    } finally {
      setIsRejecting(false)
    }
  }

  const handleToggleCondition = async (conditionId: string, isFulfilled: boolean) => {
    try {
      await toggleConditionFulfillment({
        id: conditionId as any,
        isFulfilled,
      })
      toast.success(isFulfilled ? t("conditionFulfilled") : t("conditionUnfulfilled"))
    } catch (error) {
      console.error("Error toggling condition:", error)
      toast.error(t("errorToggleCondition"))
    }
  }

  const handleChangeStatus = async (newStatus: "uploaded" | "under_review" | "approved" | "rejected") => {
    if (!documentId) return

    // For rejected status, need rejection reason
    if (newStatus === "rejected" && !rejectionReason.trim()) {
      toast.error(t("errorNoReason"))
      return
    }

    try {
      await changeStatus({
        id: documentId,
        newStatus,
        notes: newStatus === "rejected" ? rejectionReason.trim() : undefined,
      })

      toast.success(t("statusChanged"))
      setShowStatusActions(false)
      setRejectionReason("")

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error changing status:", error)
      toast.error(t("errorChangeStatus"))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">{t("status.approved")}</Badge>
      case "rejected":
        return <Badge variant="destructive">{t("status.rejected")}</Badge>
      case "uploaded":
        return <Badge variant="info">{t("status.uploaded")}</Badge>
      case "under_review":
        return <Badge variant="warning">{t("status.underReview")}</Badge>
      case "not_started":
        return <Badge variant="outline">{t("status.notStarted")}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "uploaded":
        return <Upload className="h-4 w-4 text-blue-500" />
      case "under_review":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (!document) {
    return null
  }

  const isReviewed = document.status === "approved" || document.status === "rejected"
  const canChangeStatus = document.status !== "not_started"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pr-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <DialogTitle>{t("title")}</DialogTitle>
            </div>
            {getStatusBadge(document.status)}
          </div>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* Version selector bar */}
        <div className="mb-2 space-y-2 rounded-lg border bg-muted/50 p-2 sm:p-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {versionHistory && versionHistory.length > 1 ? (
                <Select
                  value={selectedVersionId ?? latestVersion?._id ?? document._id}
                  onValueChange={(val) => {
                    const isLatest = latestVersion?._id === val
                    setSelectedVersionId(isLatest ? null : val as Id<"documentsDelivered">)
                  }}
                >
                  <SelectTrigger className="w-[140px] sm:w-[200px] h-8 text-sm">
                    <SelectValue placeholder={t("selectVersion")} />
                  </SelectTrigger>
                  <SelectContent>
                    {versionHistory.map((v) => (
                      <SelectItem key={v._id} value={v._id}>
                        v{v.version} {v.isLatest ? t("currentVersion") : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  v{document.version} {t("currentVersion")}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setShowUploadNewVersion(true)}
            >
              <Upload className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t("newVersion")}</span>
            </Button>
          </div>

          {/* Warning banner when viewing old version */}
          {isViewingOldVersion && latestVersion && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {t("viewingOldVersion", { version: `v${selectedVersion?.version}` })}
                  {" · "}
                  {t("officialVersion", { version: String(latestVersion.version) })}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-7 text-xs"
                onClick={() => setSelectedVersionId(null)}
              >
                {t("backToCurrentVersion")}
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="details" className="w-full min-h-0 flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 shrink-0">
            <TabsTrigger value="details">{t("details")}</TabsTrigger>
            <TabsTrigger value="preview">{t("preview") || "Visualizar"}</TabsTrigger>
            <TabsTrigger value="conditions" className="relative">
              {t("conditions") || "Condições"}
              {conditions && conditions.length > 0 && validationStatus && (
                <Badge
                  variant={validationStatus.allRequiredFulfilled ? "success" : "warning"}
                  className="ml-1 h-5 min-w-5 px-1"
                >
                  {validationStatus.fulfilledCount}/{validationStatus.totalConditions}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="linkedFields" className="relative">
              {t("linkedFields")}
              {linkedFields && linkedFields.length > 0 && (
                <Badge
                  variant={linkedFields.every((f) => f.isFilled) ? "success" : "warning"}
                  className="ml-1 h-5 min-w-5 px-1"
                >
                  {linkedFields.filter((f) => f.isFilled).length}/{linkedFields.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">{t("history")}</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="py-4 overflow-y-auto max-h-[55vh]">
            {displayDocument?.fileUrl && (
              <FileViewer
                fileUrl={displayDocument.fileUrl}
                fileName={displayDocument.fileName}
                mimeType={displayDocument.mimeType || ""}
                className="rounded-lg border"
              />
            )}
          </TabsContent>

          <TabsContent value="conditions" className="py-4 overflow-y-auto max-h-[55vh]">
            {conditions && conditions.length > 0 ? (
              <div className="space-y-4">
                {/* Validation status warning */}
                {validationStatus && (!validationStatus.allRequiredFulfilled || validationStatus.hasExpiredConditions) && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                      <div className="text-sm">
                        {!validationStatus.allRequiredFulfilled && (
                          <p className="text-yellow-800 dark:text-yellow-200">
                            {t("conditionsNotFulfilled")}: {validationStatus.unfulfilledRequired.join(", ")}
                          </p>
                        )}
                        {validationStatus.hasExpiredConditions && (
                          <p className="text-yellow-800 dark:text-yellow-200">
                            {t("conditionsExpired")}: {validationStatus.expiredConditions.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditions list */}
                <div className="space-y-2">
                  {conditions.map((condition) => (
                    <div
                      key={condition._id}
                      className={`flex items-start gap-3 rounded-lg border p-3 ${
                        condition.isExpired
                          ? "border-destructive/50 bg-destructive/5"
                          : condition.isFulfilled
                            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                            : ""
                      }`}
                    >
                      <Checkbox
                        id={condition._id}
                        checked={condition.isFulfilled}
                        onCheckedChange={(checked) => handleToggleCondition(condition._id, checked === true)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label
                            htmlFor={condition._id}
                            className={`font-medium cursor-pointer ${
                              condition.isFulfilled ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {condition.conditionDefinition?.name}
                          </label>
                          {condition.conditionDefinition?.isRequired && (
                            <Badge variant="default" className="text-xs">
                              {t("required") || "Obrigatório"}
                            </Badge>
                          )}
                          {condition.isExpired && (
                            <Badge variant="destructive" className="text-xs">
                              {t("expired") || "Expirado"}
                            </Badge>
                          )}
                          {condition.isFulfilled && !condition.isExpired && (
                            <Badge variant="success" className="text-xs">
                              {t("fulfilled") || "Cumprido"}
                            </Badge>
                          )}
                        </div>

                        {condition.conditionDefinition?.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {condition.conditionDefinition.description}
                          </p>
                        )}

                        {/* Expiration date */}
                        {condition.expiresAt && (
                          <p className={`text-xs mt-1 ${condition.isExpired ? "text-destructive" : "text-muted-foreground"}`}>
                            {t("expiresAt") || "Expira em"}: {format(new Date(condition.expiresAt), "PPP")}
                          </p>
                        )}

                        {/* Fulfillment info */}
                        {condition.isFulfilled && condition.fulfilledAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("fulfilledBy") || "Cumprido por"}: {condition.fulfilledByUser?.fullName || condition.fulfilledByUser?.email || t("unknown")}
                            {" • "}
                            {format(new Date(condition.fulfilledAt), "PPP p")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("noConditions") || "Este documento não possui condições definidas."}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="linkedFields" className="py-4 overflow-y-auto max-h-[55vh]">
            {linkedFields && linkedFields.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("linkedFieldsDescription")}
                  </p>
                  {!isEditingFields ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingFields(true)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      {tCommon("edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingFields(false)
                          setEditedValues({})
                        }}
                        disabled={isSavingFields}
                      >
                        {tCommon("cancel")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveFields}
                        disabled={isSavingFields || Object.keys(editedValues).length === 0}
                      >
                        {isSavingFields ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5 mr-1" />
                        )}
                        {tCommon("save")}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Group fields by entity type */}
                {(["person", "individualProcess", "passport", "company"] as const).map((entityType) => {
                  const fields = linkedFields.filter((f) => f.entityType === entityType)
                  if (fields.length === 0) return null
                  const entityLabel =
                    entityType === "person" ? t("entityPerson")
                    : entityType === "individualProcess" ? t("entityIndividualProcess")
                    : entityType === "passport" ? t("entityPassport")
                    : t("entityCompany")
                  return (
                    <div key={entityType} className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">{entityLabel}</h4>
                      <div className="space-y-1.5">
                        {fields.map((field, fi) => {
                          const editKey = getEditKey(field.entityType, field.fieldPath)
                          const displayValue = getFieldDisplayValue(field)
                          const hasEdit = editKey in editedValues
                          const isFilled = hasEdit ? displayValue !== "" : field.isFilled

                          return (
                            <div
                              key={fi}
                              className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                                isFilled
                                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                                  : ""
                              }`}
                            >
                              {isFilled ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{field.label}</span>
                                  {field.isRequired && (
                                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                      {t("required")}
                                    </Badge>
                                  )}
                                </div>
                                {isEditingFields ? (
                                  <LinkedFieldInput
                                    field={field}
                                    value={displayValue}
                                    onChange={(val) => handleFieldChange(field.entityType, field.fieldPath, val)}
                                  />
                                ) : (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {isFilled
                                      ? String(displayValue)
                                      : t("notFilled")}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("noLinkedFields")}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4 py-4 overflow-y-auto max-h-[55vh]">
          {/* Document info */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">{t("documentType")}</p>
                <p className="font-medium">{document.documentType?.name || t("looseDocument")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("version")}</p>
                <p className="font-medium">v{displayDocument?.version}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">{t("fileName")}</p>
                <p className="font-medium truncate" title={displayDocument?.fileName}>
                  {displayDocument?.fileName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("fileSize")}</p>
                <p className="font-medium">{formatFileSize(displayDocument?.fileSize ?? 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {displayDocument?.issueDate && (
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-muted-foreground">{t("issueDate")}</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-xs">
                        {t("issueDateTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="font-medium">
                    {format(new Date(displayDocument.issueDate), "PPP")}
                  </p>
                </div>
              )}
              {displayDocument?.expiryDate && (
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-muted-foreground">{t("expiryDate")}</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-xs">
                        {t("expiryDateTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="font-medium">
                    {format(new Date(displayDocument.expiryDate), "PPP")}
                  </p>
                </div>
              )}
            </div>

            {/* Validity status */}
            {displayDocument && "validityCheck" in displayDocument && (displayDocument as any).validityCheck && (displayDocument as any).validityCheck.status !== "no_rule" && (
              <div className={cn(
                "flex items-start gap-2 rounded-lg border p-3",
                (displayDocument as any).validityCheck.status === "expired" && "border-destructive/50 bg-destructive/5",
                (displayDocument as any).validityCheck.status === "expiring_soon" && "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
                (displayDocument as any).validityCheck.status === "valid" && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
                (displayDocument as any).validityCheck.status === "missing_date" && "border-muted",
              )}>
                {(displayDocument as any).validityCheck.status === "expired" && (
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                )}
                {(displayDocument as any).validityCheck.status === "expiring_soon" && (
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                )}
                {(displayDocument as any).validityCheck.status === "valid" && (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                )}
                <div className="text-sm">
                  <Badge
                    variant={
                      (displayDocument as any).validityCheck.status === "expired" ? "destructive"
                      : (displayDocument as any).validityCheck.status === "expiring_soon" ? "warning"
                      : (displayDocument as any).validityCheck.status === "valid" ? "success"
                      : "outline"
                    }
                    className="text-xs"
                  >
                    {t(`validity.${(displayDocument as any).validityCheck.status}`)}
                  </Badge>
                  {(displayDocument as any).validityCheck.daysValue !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("validity.daysInfo", { days: (displayDocument as any).validityCheck.daysValue })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {displayDocument?.versionNotes && (
              <div className="text-sm">
                <p className="text-muted-foreground">{t("versionNotes")}</p>
                <p className="font-medium">{displayDocument.versionNotes}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Upload info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("uploadedBy")}:</span>
              <span className="font-medium">
                {displayDocument && "uploadedByProfile" in displayDocument
                  ? (displayDocument.uploadedByProfile as any)?.fullName || (displayDocument.uploadedByUser as any)?.email || t("unknown")
                  : displayDocument?.uploadedByUser?.email || t("unknown")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("uploadedAt")}:</span>
              <span className="font-medium">
                {displayDocument?.uploadedAt
                  ? format(new Date(displayDocument.uploadedAt), "PPP p")
                  : t("unknown")}
              </span>
            </div>
          </div>

          {/* Review info for displayed version */}
          {displayDocument?.status && (displayDocument.status === "approved" || displayDocument.status === "rejected") && displayDocument.reviewedBy && (
            <>
              <Separator />
              <div className="space-y-2 text-sm bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusBadge(displayDocument.status)}
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("reviewedBy")}:</span>
                  <span className="font-medium">
                    {displayDocument && "reviewedByProfile" in displayDocument
                      ? (displayDocument.reviewedByProfile as any)?.fullName || (displayDocument.reviewedByUser as any)?.email || t("unknown")
                      : (displayDocument as any)?.reviewedByUser?.email || t("unknown")}
                  </span>
                </div>
                {displayDocument.reviewedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("reviewedAt")}:</span>
                    <span className="font-medium">
                      {format(new Date(displayDocument.reviewedAt), "PPP p")}
                    </span>
                  </div>
                )}
                {displayDocument.rejectionReason && (
                  <div className="mt-2">
                    <p className="text-muted-foreground font-medium">{t("rejectionReason")}:</p>
                    <p className="mt-1">{displayDocument.rejectionReason}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* File preview / download */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(displayDocument?.fileUrl, "_blank")}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("downloadFile")}
            </Button>
          </div>

          {/* Status change section — only for current version */}
          {!isViewingOldVersion && canChangeStatus && (
            <>
              <Separator />
              <Collapsible open={showStatusActions} onOpenChange={setShowStatusActions}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      {t("changeStatus")}
                    </span>
                    <ArrowRight className={`h-4 w-4 transition-transform ${showStatusActions ? "rotate-90" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Rejection reason input */}
                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">
                      {t("rejectionReason")} ({t("requiredForRejection")})
                    </Label>
                    <Textarea
                      id="rejectionReason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={t("rejectionReasonPlaceholder")}
                      disabled={isApproving || isRejecting}
                      rows={3}
                    />
                  </div>

                  {/* Status change buttons */}
                  <div className="flex flex-wrap gap-2">
                    {document.status !== "uploaded" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChangeStatus("uploaded")}
                        disabled={isApproving || isRejecting}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {t("status.uploaded")}
                      </Button>
                    )}
                    {document.status !== "under_review" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChangeStatus("under_review")}
                        disabled={isApproving || isRejecting}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        {t("status.underReview")}
                      </Button>
                    )}
                    {document.status !== "approved" && (
                      <Button
                        size="sm"
                        onClick={handleApprove}
                        disabled={isApproving || isRejecting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isApproving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t("approve")}
                      </Button>
                    )}
                    {document.status !== "rejected" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleReject}
                        disabled={isApproving || isRejecting || !rejectionReason.trim()}
                      >
                        {isRejecting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                        <XCircle className="h-4 w-4 mr-1" />
                        {t("reject")}
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
          </TabsContent>

          <TabsContent value="history" className="py-4 overflow-y-auto max-h-[55vh]">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                {t("statusHistory")}
              </h3>

              {/* Status change timeline */}
              {statusHistory && statusHistory.length > 0 ? (
                <div className="space-y-3">
                  {statusHistory.map((entry, index) => (
                    <div key={entry._id} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        {getStatusIcon(entry.newStatus)}
                        {index < statusHistory.length - 1 && (
                          <div className="w-px h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.previousStatus && (
                            <>
                              {getStatusBadge(entry.previousStatus)}
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            </>
                          )}
                          {getStatusBadge(entry.newStatus)}
                        </div>
                        <div className="text-muted-foreground mt-1">
                          <span className="font-medium">
                            {entry.changedByProfile?.fullName || entry.changedByUser?.email || t("unknown")}
                          </span>
                          {" • "}
                          {format(new Date(entry.changedAt), "PPP p")}
                        </div>
                        {entry.notes && (
                          <div className="mt-1 p-2 bg-muted rounded text-sm">
                            {entry.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("noStatusHistory")}</p>
                </div>
              )}

              <Separator />

              {/* File upload events — all versions */}
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {t("documentHistory")}
              </h3>
              {versionHistory && versionHistory.length > 0 ? (
                <div className="space-y-3">
                  {versionHistory.map((ver, index) => (
                    <div key={ver._id} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <Upload className="h-4 w-4 text-blue-500" />
                        {index < versionHistory.length - 1 && (
                          <div className="w-px h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="info">{t("fileUploaded")}</Badge>
                          <Badge variant={ver.isLatest ? "success" : "secondary"} className="text-xs">
                            v{ver.version}{ver.isLatest ? ` ${t("currentVersion")}` : ""}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground mt-1">
                          <span className="font-medium">
                            {ver.uploadedByProfile?.fullName || ver.uploadedByUser?.email || t("unknown")}
                          </span>
                          {" • "}
                          {format(new Date(ver.uploadedAt), "PPP p")}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {ver.fileName} ({formatFileSize(ver.fileSize)})
                        </div>
                        {ver.versionNotes && (
                          <div className="mt-1 p-2 bg-muted rounded text-xs">
                            {ver.versionNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center">
                    <Upload className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{t("fileUploaded")}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      <span className="font-medium">
                        {document.uploadedByUser?.email || t("unknown")}
                      </span>
                      {" • "}
                      {format(new Date(document.uploadedAt), "PPP p")}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {document.fileName} ({formatFileSize(document.fileSize)})
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {!isViewingOldVersion && !isReviewed && !showStatusActions ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isApproving || isRejecting}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowStatusActions(true)}
                disabled={isApproving || isRejecting}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("reject")}
              </Button>
              <Button
                type="button"
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-2 h-4 w-4" />
                {t("approve")}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Upload New Version Dialog */}
      {document && document.documentTypeId && (
        <UploadNewVersionDialog
          open={showUploadNewVersion}
          onOpenChange={setShowUploadNewVersion}
          individualProcessId={document.individualProcessId}
          documentTypeId={document.documentTypeId}
          documentRequirementId={document.documentRequirementId}
          currentVersion={document.version}
          currentFileName={document.fileName}
          currentFileSize={document.fileSize}
          currentStatus={document.status}
          onSuccess={() => {
            setSelectedVersionId(null)
          }}
        />
      )}
    </Dialog>
  )
}
