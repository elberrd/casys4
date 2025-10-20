"use client"

import { useQuery } from "convex/react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Calendar,
  Download,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface DocumentHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  individualProcessId: Id<"individualProcesses">
  documentTypeId: Id<"documentTypes">
  documentRequirementId?: Id<"documentRequirements">
}

export function DocumentHistoryDialog({
  open,
  onOpenChange,
  individualProcessId,
  documentTypeId,
  documentRequirementId,
}: DocumentHistoryDialogProps) {
  const t = useTranslations("DocumentHistory")
  const tCommon = useTranslations("Common")

  const documentHistory = useQuery(
    api.documentsDelivered.getVersionHistory,
    {
      individualProcessId,
      documentTypeId,
      documentRequirementId,
    }
  )

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-destructive" />
      case "uploaded":
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
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
            <div className="space-y-4">
              {documentHistory.map((doc, index) => (
                <div
                  key={doc._id}
                  className={cn(
                    "relative border rounded-lg p-4 space-y-3",
                    doc.isLatest && "border-primary bg-primary/5"
                  )}
                >
                  {/* Version header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(doc.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {t("version")} {doc.version}
                          </span>
                          {doc.isLatest && (
                            <Badge variant="outline" className="text-xs">
                              {t("current")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {doc.fileName}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>

                  <Separator />

                  {/* File info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("fileSize")}</p>
                      <p className="font-medium">{formatFileSize(doc.fileSize)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("mimeType")}</p>
                      <p className="font-medium truncate" title={doc.mimeType}>
                        {doc.mimeType}
                      </p>
                    </div>
                  </div>

                  {/* Upload info */}
                  <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-md">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("uploadedBy")}:</span>
                      <span className="font-medium">
                        {doc.uploadedByUser?.email || t("unknown")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("uploadedAt")}:</span>
                      <span className="font-medium">
                        {format(new Date(doc.uploadedAt), "PPP p")}
                      </span>
                    </div>
                  </div>

                  {/* Review info */}
                  {doc.reviewedBy && (
                    <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("reviewedBy")}:</span>
                        <span className="font-medium">
                          {doc.reviewedByUser?.email || t("unknown")}
                        </span>
                      </div>
                      {doc.reviewedAt && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t("reviewedAt")}:</span>
                          <span className="font-medium">
                            {format(new Date(doc.reviewedAt), "PPP p")}
                          </span>
                        </div>
                      )}
                      {doc.rejectionReason && (
                        <div className="mt-2">
                          <p className="text-muted-foreground font-medium">
                            {t("rejectionReason")}:
                          </p>
                          <p className="mt-1">{doc.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expiry date */}
                  {doc.expiryDate && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">{t("expiryDate")}</p>
                      <p className="font-medium">
                        {format(new Date(doc.expiryDate), "PPP")}
                      </p>
                    </div>
                  )}

                  {/* Download button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.fileUrl, "_blank")}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("downloadVersion", { version: doc.version })}
                  </Button>

                  {/* Timeline connector */}
                  {index < documentHistory.length - 1 && (
                    <div className="absolute left-[30px] top-full h-4 w-0.5 bg-border" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
