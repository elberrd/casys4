"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { useTranslations } from "next-intl"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Calendar,
  Download,
  Upload,
  RotateCcw,
  MessageSquare,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { UploadNewVersionDialog } from "./upload-new-version-dialog"

interface DocumentHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  individualProcessId: Id<"individualProcesses">
  documentTypeId: Id<"documentTypes">
  documentRequirementId?: Id<"documentRequirements">
  userRole?: "admin" | "client"
}

export function DocumentHistoryDialog({
  open,
  onOpenChange,
  individualProcessId,
  documentTypeId,
  documentRequirementId,
  userRole = "client",
}: DocumentHistoryDialogProps) {
  const t = useTranslations("DocumentHistory")
  const tCommon = useTranslations("Common")

  const [restoreDocId, setRestoreDocId] = useState<Id<"documentsDelivered"> | null>(null)
  const [restoreVersion, setRestoreVersion] = useState<number>(0)
  const [isRestoring, setIsRestoring] = useState(false)
  const [showUploadNewVersion, setShowUploadNewVersion] = useState(false)

  const documentHistory = useQuery(
    api.documentsDelivered.getVersionHistory,
    {
      individualProcessId,
      documentTypeId,
      documentRequirementId,
    }
  )

  const restoreVersionMutation = useMutation(api.documentsDelivered.restoreVersion)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const getFileSizeDiff = (currentSize: number, previousSize: number | undefined) => {
    if (!previousSize) return null
    const diff = currentSize - previousSize
    if (diff === 0) return null
    const sign = diff > 0 ? "+" : ""
    return {
      text: `${sign}${formatFileSize(Math.abs(diff))}`,
      positive: diff > 0,
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "uploaded":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
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

  const handleRestore = async () => {
    if (!restoreDocId) return
    try {
      setIsRestoring(true)
      await restoreVersionMutation({ documentId: restoreDocId })
      toast.success(t("restoreSuccess"))
      setRestoreDocId(null)
    } catch (error) {
      console.error("Error restoring version:", error)
      toast.error(t("restoreError"))
    } finally {
      setIsRestoring(false)
    }
  }

  // Get current latest doc info for the upload dialog
  const currentDoc = documentHistory?.find((doc) => doc.isLatest)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("title")}
              </DialogTitle>
              {userRole === "admin" && currentDoc && (
                <Button
                  size="sm"
                  onClick={() => setShowUploadNewVersion(true)}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {t("uploadNewVersion")}
                </Button>
              )}
            </div>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {documentHistory === undefined && (
              <div className="text-center py-8 text-muted-foreground">
                {tCommon("loading")}
              </div>
            )}

            {documentHistory && documentHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("noHistory")}</p>
              </div>
            )}

            {documentHistory && documentHistory.length > 0 && (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-border" />

                <div className="space-y-0">
                  {documentHistory.map((doc, index) => {
                    const previousDoc = documentHistory[index + 1]
                    const sizeDiff = getFileSizeDiff(doc.fileSize, previousDoc?.fileSize)
                    const uploaderName = doc.uploadedByProfile?.fullName || doc.uploadedByUser?.email || t("unknown")
                    const reviewerName = doc.reviewedByProfile?.fullName || doc.reviewedByUser?.email

                    return (
                      <div key={doc._id} className="relative pl-10 pb-6 last:pb-0">
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            "absolute left-[9px] top-1.5 w-[13px] h-[13px] rounded-full border-2 bg-background",
                            doc.isLatest
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          )}
                        />

                        <div
                          className={cn(
                            "border rounded-lg p-4 space-y-3",
                            doc.isLatest && "border-primary bg-primary/5"
                          )}
                        >
                          {/* Version header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.status)}
                              <span className="font-semibold text-sm">
                                {t("version")} {doc.version}
                              </span>
                              {doc.isLatest && (
                                <Badge variant="outline" className="text-xs">
                                  {t("current")}
                                </Badge>
                              )}
                              {sizeDiff && (
                                <span
                                  className={cn(
                                    "text-xs font-mono",
                                    sizeDiff.positive ? "text-orange-500" : "text-green-500"
                                  )}
                                >
                                  {sizeDiff.text}
                                </span>
                              )}
                            </div>
                            {getStatusBadge(doc.status)}
                          </div>

                          {/* File info */}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground truncate flex-1" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                            <span className="text-muted-foreground whitespace-nowrap">
                              {formatFileSize(doc.fileSize)}
                            </span>
                          </div>

                          {/* Version notes */}
                          {doc.versionNotes && (
                            <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">
                                {doc.versionNotes}
                              </p>
                            </div>
                          )}

                          {/* Upload/review info */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {uploaderName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(doc.uploadedAt), "PPP p")}
                            </span>
                          </div>

                          {/* Rejection info */}
                          {doc.rejectionReason && (
                            <div className="text-sm p-2 bg-destructive/10 rounded-md whitespace-pre-wrap">
                              <span className="font-medium text-destructive">
                                {t("rejectionReason")}:
                              </span>{" "}
                              {doc.rejectionReason}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc.fileUrl, "_blank")}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              {t("downloadVersion")}
                            </Button>
                            {!doc.isLatest && userRole === "admin" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRestoreDocId(doc._id)
                                  setRestoreVersion(doc.version)
                                }}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                {t("restoreVersion")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore confirmation dialog */}
      <AlertDialog open={!!restoreDocId} onOpenChange={(open) => !open && setRestoreDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("restoreVersion")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("restoreVersionConfirm", { version: restoreVersion })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {t("restoreVersion")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload new version dialog */}
      {showUploadNewVersion && currentDoc && (
        <UploadNewVersionDialog
          open={showUploadNewVersion}
          onOpenChange={setShowUploadNewVersion}
          individualProcessId={individualProcessId}
          documentTypeId={documentTypeId}
          documentRequirementId={documentRequirementId}
          currentVersion={currentDoc.version}
          currentFileName={currentDoc.fileName}
          currentFileSize={currentDoc.fileSize}
          currentStatus={currentDoc.status}
          onSuccess={() => setShowUploadNewVersion(false)}
        />
      )}
    </>
  )
}
