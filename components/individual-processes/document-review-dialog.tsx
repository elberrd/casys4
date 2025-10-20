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
} from "lucide-react"
import { format } from "date-fns"
import { EntityHistory } from "@/components/activity-logs/entity-history"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

  const document = useQuery(
    api.documentsDelivered.get,
    documentId ? { id: documentId } : "skip"
  )

  const approve = useMutation(api.documentsDelivered.approve)
  const reject = useMutation(api.documentsDelivered.reject)

  const handleApprove = async () => {
    if (!documentId) return

    try {
      setIsApproving(true)

      await approve({ id: documentId })

      toast.success(t("approveSuccess"))
      onOpenChange(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error approving document:", error)
      toast.error(t("errorApprove"))
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
      onOpenChange(false)
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
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!document) {
    return null
  }

  const isReviewed = document.status === "approved" || document.status === "rejected"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <DialogTitle>{t("title")}</DialogTitle>
            </div>
            {getStatusBadge(document.status)}
          </div>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">{t("details")}</TabsTrigger>
            <TabsTrigger value="history">{t("history")}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-4">
          {/* Document info */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">{t("documentType")}</p>
                <p className="font-medium">{document.documentType?.name}</p>
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

          {/* Review info (if already reviewed) */}
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

          {/* Rejection reason input (for admin if not yet reviewed) */}
          {!isReviewed && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">
                  {t("rejectionReason")} ({tCommon("optional")})
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
            </>
          )}
          </TabsContent>

          <TabsContent value="history" className="py-4">
            {documentId && (
              <EntityHistory
                entityType="documentsDelivered"
                entityId={documentId}
                title={t("documentHistory")}
              />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {!isReviewed ? (
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
                onClick={handleReject}
                disabled={isApproving || isRejecting || !rejectionReason.trim()}
              >
                {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
