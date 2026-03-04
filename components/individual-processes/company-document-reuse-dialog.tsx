"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { FileViewer } from "@/components/ui/file-viewer"
import {
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  User,
  ArrowLeft,
  Download,
  Calendar,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface CompanyDocumentReuseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyApplicantId: Id<"companies">
  documentTypeId: Id<"documentTypes">
  targetDocumentId: Id<"documentsDelivered">
  individualProcessId: Id<"individualProcesses">
  documentTypeName: string
  onSuccess?: () => void
}

interface ReusableDocument {
  _id: Id<"documentsDelivered">
  fileName: string
  fileSize: number
  mimeType: string
  fileUrl: string
  status: string
  version: number
  uploadedAt: number
  issueDate?: string
  expiryDate?: string
  personName?: string
  processId: Id<"individualProcesses">
}

export function CompanyDocumentReuseDialog({
  open,
  onOpenChange,
  companyApplicantId,
  documentTypeId,
  targetDocumentId,
  individualProcessId,
  documentTypeName,
  onSuccess,
}: CompanyDocumentReuseDialogProps) {
  const t = useTranslations("DocumentChecklist")
  const tCommon = useTranslations("Common")
  const [isReusing, setIsReusing] = useState<Id<"documentsDelivered"> | null>(null)
  const [previewDoc, setPreviewDoc] = useState<ReusableDocument | null>(null)

  const reusableDocuments = useQuery(
    api.documentsDelivered.listCompanyDocumentsForReuse,
    open
      ? {
          companyApplicantId,
          documentTypeId,
          excludeProcessId: individualProcessId,
        }
      : "skip"
  )

  const reuseDocument = useMutation(api.documentsDelivered.reuseCompanyDocument)

  const handleReuse = async (sourceDocumentId: Id<"documentsDelivered">) => {
    setIsReusing(sourceDocumentId)
    try {
      await reuseDocument({
        targetDocumentId,
        sourceDocumentId,
      })
      toast.success(t("reuseSuccess"))
      setPreviewDoc(null)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(t("reuseError"))
    } finally {
      setIsReusing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("status.approved")}
          </Badge>
        )
      case "uploaded":
        return (
          <Badge variant="info" className="gap-1">
            <Clock className="h-3 w-3" />
            {t("status.uploaded")}
          </Badge>
        )
      case "under_review":
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            {t("status.underReview")}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setPreviewDoc(null)
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={previewDoc ? "max-w-4xl" : "max-w-lg"}>
        {previewDoc ? (
          // Preview mode
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewDoc(null)}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <Info className="h-4 w-4" />
                    {t("previewTitle")}
                  </DialogTitle>
                  <DialogDescription className="truncate">
                    {previewDoc.fileName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Side-by-side: info left, file preview right */}
            <div className="flex gap-4">
              {/* Left: Document info */}
              <div className="w-56 shrink-0 space-y-3 text-sm border rounded-lg p-3 bg-muted/30 self-start">
                <div>
                  <span className="text-muted-foreground">{t("previewFileName")}</span>
                  <p className="font-medium break-all">{previewDoc.fileName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-0.5">{getStatusBadge(previewDoc.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("previewVersion")}</span>
                  <p className="font-medium">v{previewDoc.version}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("previewSize")}</span>
                  <p className="font-medium">{formatFileSize(previewDoc.fileSize)}</p>
                </div>
                {previewDoc.personName && (
                  <div>
                    <span className="text-muted-foreground">{t("previewProcess")}</span>
                    <p className="font-medium flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {previewDoc.personName}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t("previewUploadDate")}</span>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(previewDoc.uploadedAt), "dd/MM/yyyy")}
                  </p>
                </div>
                {previewDoc.issueDate && (
                  <div>
                    <span className="text-muted-foreground">{t("previewIssueDate")}</span>
                    <p className="font-medium">{previewDoc.issueDate}</p>
                  </div>
                )}
                {previewDoc.expiryDate && (
                  <div>
                    <span className="text-muted-foreground">{t("previewExpiryDate")}</span>
                    <p className="font-medium">{previewDoc.expiryDate}</p>
                  </div>
                )}
              </div>

              {/* Right: File preview */}
              {previewDoc.fileUrl && (
                <div className="flex-1 min-w-0 border rounded-lg overflow-hidden">
                  <FileViewer
                    fileUrl={previewDoc.fileUrl}
                    fileName={previewDoc.fileName}
                    mimeType={previewDoc.mimeType}
                    className="max-h-[450px]"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2">
              {previewDoc.fileUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewDoc.fileUrl, "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  {t("previewDownload")}
                </Button>
              )}
              <div className="flex-1" />
              <Button
                size="sm"
                onClick={() => handleReuse(previewDoc._id)}
                disabled={isReusing !== null}
              >
                {isReusing === previewDoc._id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-1" />
                )}
                {t("selectToReuse")}
              </Button>
            </div>
          </>
        ) : (
          // List mode
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                {t("reuseDialogTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("reuseDialogDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">{documentTypeName}</span>
            </div>

            {reusableDocuments === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reusableDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t("noCompanyDocuments")}</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {reusableDocuments.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex min-w-0 items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <button
                        type="button"
                        className="flex-1 min-w-0 mr-3 text-left cursor-pointer overflow-hidden"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        <div className="flex flex-wrap items-start gap-2 mb-1 min-w-0">
                          <p className="text-sm font-medium hover:underline min-w-0 flex-1 whitespace-normal break-words break-all">
                            {doc.fileName}
                          </p>
                          <span className="shrink-0">{getStatusBadge(doc.status)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {doc.personName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {doc.personName}
                            </span>
                          )}
                          <span>v{doc.version}</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>
                            {format(new Date(doc.uploadedAt), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 self-start"
                        onClick={() => handleReuse(doc._id)}
                        disabled={isReusing !== null}
                      >
                        {isReusing === doc._id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-1" />
                        )}
                        {t("selectToReuse")}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
