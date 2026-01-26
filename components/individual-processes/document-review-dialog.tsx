"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
} from "lucide-react"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileViewer } from "@/components/ui/file-viewer"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"

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

  const document = useQuery(
    api.documentsDelivered.get,
    documentId ? { id: documentId } : "skip"
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

  const approve = useMutation(api.documentsDelivered.approve)
  const toggleConditionFulfillment = useMutation(api.documentDeliveredConditions.toggleFulfillment)
  const reject = useMutation(api.documentsDelivered.reject)
  const changeStatus = useMutation(api.documentsDelivered.changeStatus)

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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <DialogTitle>{t("title")}</DialogTitle>
            </div>
            {getStatusBadge(document.status)}
          </div>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="history">{t("history")}</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="py-4">
            {document.fileUrl && (
              <FileViewer
                fileUrl={document.fileUrl}
                fileName={document.fileName}
                mimeType={document.mimeType || ""}
                className="rounded-lg border"
              />
            )}
          </TabsContent>

          <TabsContent value="conditions" className="py-4">
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

          <TabsContent value="details" className="space-y-4 py-4">
          {/* Document info */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">{t("documentType")}</p>
                <p className="font-medium">{document.documentType?.name || t("looseDocument")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("version")}</p>
                <p className="font-medium">v{document.version}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">{t("fileName")}</p>
                <p className="font-medium truncate" title={document.fileName}>
                  {document.fileName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("fileSize")}</p>
                <p className="font-medium">{formatFileSize(document.fileSize)}</p>
              </div>
            </div>

            {document.expiryDate && (
              <div className="text-sm">
                <p className="text-muted-foreground">{t("expiryDate")}</p>
                <p className="font-medium">
                  {format(new Date(document.expiryDate), "PPP")}
                </p>
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
                {document.uploadedByUser?.email || t("unknown")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("uploadedAt")}:</span>
              <span className="font-medium">
                {format(new Date(document.uploadedAt), "PPP p")}
              </span>
            </div>
          </div>

          {/* Current review info (if already reviewed) */}
          {isReviewed && document.reviewedBy && (
            <>
              <Separator />
              <div className="space-y-2 text-sm bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("reviewedBy")}:</span>
                  <span className="font-medium">
                    {document.reviewedByUser?.email || t("unknown")}
                  </span>
                </div>
                {document.reviewedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("reviewedAt")}:</span>
                    <span className="font-medium">
                      {format(new Date(document.reviewedAt), "PPP p")}
                    </span>
                  </div>
                )}
                {document.rejectionReason && (
                  <div className="mt-2">
                    <p className="text-muted-foreground font-medium">{t("rejectionReason")}:</p>
                    <p className="mt-1">{document.rejectionReason}</p>
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
              onClick={() => window.open(document.fileUrl, "_blank")}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("downloadFile")}
            </Button>
          </div>

          {/* Status change section */}
          {canChangeStatus && (
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

          <TabsContent value="history" className="py-4">
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

              {/* File upload event */}
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
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {!isReviewed && !showStatusActions ? (
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
    </Dialog>
  )
}
