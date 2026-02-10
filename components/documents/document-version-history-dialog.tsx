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
import { DocumentVersionUploadDialog } from "./document-version-upload-dialog"

interface DocumentVersionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: Id<"documents">
  documentName: string
  userRole?: "admin" | "client"
}

export function DocumentVersionHistoryDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  userRole = "client",
}: DocumentVersionHistoryDialogProps) {
  const t = useTranslations("DocumentHistory")
  const tCommon = useTranslations("Common")

  const [restoreDocId, setRestoreDocId] = useState<Id<"documents"> | null>(null)
  const [restoreVersion, setRestoreVersion] = useState<number>(0)
  const [isRestoring, setIsRestoring] = useState(false)
  const [showUploadNewVersion, setShowUploadNewVersion] = useState(false)

  const versionHistory = useQuery(
    api.documents.getVersionHistory,
    { documentId }
  )

  const restoreVersionMutation = useMutation(api.documents.restoreVersion)

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

  const currentDoc = versionHistory?.find((doc) => doc.isLatest === true)

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
            <DialogDescription>
              <span className="font-medium text-foreground">{documentName}</span>
              {" - "}
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {versionHistory === undefined && (
              <div className="text-center py-8 text-muted-foreground">
                {tCommon("loading")}
              </div>
            )}

            {versionHistory && versionHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("noHistory")}</p>
              </div>
            )}

            {versionHistory && versionHistory.length > 0 && (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-border" />

                <div className="space-y-0">
                  {versionHistory.map((doc, index) => {
                    const previousDoc = versionHistory[index + 1]
                    const sizeDiff = doc.fileSize ? getFileSizeDiff(doc.fileSize, previousDoc?.fileSize) : null
                    const isLatest = doc.isLatest === true || (doc.isLatest === undefined && index === 0)
                    const version = doc.version || 1

                    return (
                      <div key={doc._id} className="relative pl-10 pb-6 last:pb-0">
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            "absolute left-[9px] top-1.5 w-[13px] h-[13px] rounded-full border-2 bg-background",
                            isLatest
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          )}
                        />

                        <div
                          className={cn(
                            "border rounded-lg p-4 space-y-3",
                            isLatest && "border-primary bg-primary/5"
                          )}
                        >
                          {/* Version header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">
                                {t("version")} {version}
                              </span>
                              {isLatest && (
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
                            {doc.documentType && (
                              <Badge variant="secondary" className="text-xs">
                                {doc.documentType.name}
                              </Badge>
                            )}
                          </div>

                          {/* File info */}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground truncate flex-1" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                            <span className="text-muted-foreground whitespace-nowrap">
                              {doc.fileSize ? formatFileSize(doc.fileSize) : "-"}
                            </span>
                          </div>

                          {/* Version notes */}
                          {doc.versionNotes && (
                            <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-sm italic text-muted-foreground">
                                {doc.versionNotes}
                              </p>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {doc.person && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {doc.person.fullName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(doc.createdAt), "PPP p")}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            {doc.fileUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.fileUrl!, "_blank")}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                {t("downloadVersion")}
                              </Button>
                            )}
                            {!isLatest && userRole === "admin" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRestoreDocId(doc._id)
                                  setRestoreVersion(version)
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
        <DocumentVersionUploadDialog
          open={showUploadNewVersion}
          onOpenChange={setShowUploadNewVersion}
          documentId={documentId}
          currentVersion={currentDoc.version || 1}
          currentFileName={currentDoc.fileName || ""}
          currentFileSize={currentDoc.fileSize || 0}
          documentName={documentName}
          onSuccess={() => setShowUploadNewVersion(false)}
        />
      )}
    </>
  )
}
