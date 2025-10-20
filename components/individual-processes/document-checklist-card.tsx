"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  Eye,
  History
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DocumentUploadDialog } from "./document-upload-dialog"
import { DocumentReviewDialog } from "./document-review-dialog"
import { DocumentHistoryDialog } from "./document-history-dialog"
import { BulkDocumentActionsMenu } from "./bulk-document-actions-menu"

interface DocumentChecklistCardProps {
  individualProcessId: Id<"individualProcesses">
  userRole?: "admin" | "client"
}

type DialogState = {
  upload: { open: boolean; document: any | null }
  review: { open: boolean; documentId: Id<"documentsDelivered"> | null }
  history: {
    open: boolean
    documentTypeId: Id<"documentTypes"> | null
    documentRequirementId: Id<"documentRequirements"> | null
  }
}

export function DocumentChecklistCard({
  individualProcessId,
  userRole = "client"
}: DocumentChecklistCardProps) {
  const t = useTranslations("DocumentChecklist")
  const tCommon = useTranslations("Common")

  const documents = useQuery(api.documentsDelivered.list, {
    individualProcessId,
  })

  const [dialogs, setDialogs] = useState<DialogState>({
    upload: { open: false, document: null },
    review: { open: false, documentId: null },
    history: { open: false, documentTypeId: null, documentRequirementId: null },
  })

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<Id<"documentsDelivered">>>(new Set())

  const openUploadDialog = (doc: any) => {
    setDialogs(prev => ({ ...prev, upload: { open: true, document: doc } }))
  }

  const openReviewDialog = (documentId: Id<"documentsDelivered">) => {
    setDialogs(prev => ({ ...prev, review: { open: true, documentId } }))
  }

  const openHistoryDialog = (
    documentTypeId: Id<"documentTypes">,
    documentRequirementId?: Id<"documentRequirements">
  ) => {
    setDialogs(prev => ({
      ...prev,
      history: {
        open: true,
        documentTypeId,
        documentRequirementId: documentRequirementId || null,
      },
    }))
  }

  const closeAllDialogs = () => {
    setDialogs({
      upload: { open: false, document: null },
      review: { open: false, documentId: null },
      history: { open: false, documentTypeId: null, documentRequirementId: null },
    })
  }

  const toggleDocumentSelection = (docId: Id<"documentsDelivered">) => {
    setSelectedDocumentIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(docId)) {
        newSet.delete(docId)
      } else {
        newSet.add(docId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (!documents) return

    const selectableDocs = documents.filter(doc => doc.status !== "not_started")
    if (selectedDocumentIds.size === selectableDocs.length) {
      setSelectedDocumentIds(new Set())
    } else {
      setSelectedDocumentIds(new Set(selectableDocs.map(doc => doc._id)))
    }
  }

  const handleBulkActionSuccess = () => {
    setSelectedDocumentIds(new Set())
  }

  if (documents === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{tCommon("loading")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Group documents by required vs optional
  const requiredDocs = documents.filter(doc => doc.documentRequirement?.isRequired)
  const optionalDocs = documents.filter(doc => !doc.documentRequirement?.isRequired)

  // Calculate progress
  const totalRequired = requiredDocs.length
  const completedRequired = requiredDocs.filter(
    doc => doc.status === "approved"
  ).length

  const getStatusBadge = (status: string, isCritical?: boolean) => {
    switch (status) {
      case "approved":
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />{t("status.approved")}</Badge>
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{t("status.rejected")}</Badge>
      case "uploaded":
        return <Badge variant="info" className="gap-1"><Clock className="h-3 w-3" />{t("status.uploaded")}</Badge>
      case "under_review":
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />{t("status.underReview")}</Badge>
      case "not_started":
        return <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />{t("status.notStarted")}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-destructive" />
      case "uploaded":
      case "under_review":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "not_started":
        return <FileText className="h-5 w-5 text-muted-foreground" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  // Get selected documents with full info for bulk actions
  const selectedDocuments = documents?.filter(doc => selectedDocumentIds.has(doc._id)) || []
  const selectableDocs = documents?.filter(doc => doc.status !== "not_started") || []
  const allSelectableSelected = selectableDocs.length > 0 && selectedDocumentIds.size === selectableDocs.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-3">
              {selectableDocs.length > 0 && (
                <Checkbox
                  checked={allSelectableSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label={t("selectAll")}
                />
              )}
              <span>{t("title")}</span>
              <Badge variant="outline">
                {completedRequired} / {totalRequired} {t("completed")}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2">{t("description")}</CardDescription>
          </div>
          {selectedDocuments.length > 0 && (
            <BulkDocumentActionsMenu
              selectedDocuments={selectedDocuments}
              onSuccess={handleBulkActionSuccess}
              userRole={userRole}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress bar */}
        {totalRequired > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("progress")}</span>
              <span className="font-medium">
                {Math.round((completedRequired / totalRequired) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(completedRequired / totalRequired) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Required Documents */}
        {requiredDocs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {t("requiredDocuments")}
            </h3>
            <div className="space-y-2">
              {requiredDocs.map((doc) => (
                <div
                  key={doc._id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                    doc.documentRequirement?.isCritical && "border-destructive/50",
                    selectedDocumentIds.has(doc._id) && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {doc.status !== "not_started" && (
                      <Checkbox
                        checked={selectedDocumentIds.has(doc._id)}
                        onCheckedChange={() => toggleDocumentSelection(doc._id)}
                        aria-label={`Select ${doc.documentType?.name}`}
                      />
                    )}
                    {getStatusIcon(doc.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {doc.documentType?.name}
                        </p>
                        {doc.documentRequirement?.isCritical && (
                          <Badge variant="destructive" className="text-xs">
                            {t("critical")}
                          </Badge>
                        )}
                      </div>
                      {doc.documentRequirement?.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {doc.documentRequirement.description}
                        </p>
                      )}
                      {doc.fileName && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {doc.fileName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    {getStatusBadge(doc.status, doc.documentRequirement?.isCritical)}

                    {doc.status === "not_started" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUploadDialog(doc)}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {t("upload")}
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openReviewDialog(doc._id)}
                          title={t("viewDetails")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openHistoryDialog(doc.documentTypeId, doc.documentRequirementId)}
                          title={t("viewHistory")}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        {doc.status === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openUploadDialog(doc)}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            {t("reupload")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Documents */}
        {optionalDocs.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t("optionalDocuments")}
              </h3>
              <div className="space-y-2">
                {optionalDocs.map((doc) => (
                  <div
                    key={doc._id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                      selectedDocumentIds.has(doc._id) && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {doc.status !== "not_started" && (
                        <Checkbox
                          checked={selectedDocumentIds.has(doc._id)}
                          onCheckedChange={() => toggleDocumentSelection(doc._id)}
                          aria-label={`Select ${doc.documentType?.name}`}
                        />
                      )}
                      {getStatusIcon(doc.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.documentType?.name}
                        </p>
                        {doc.documentRequirement?.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.documentRequirement.description}
                          </p>
                        )}
                        {doc.fileName && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {doc.fileName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-3">
                      {getStatusBadge(doc.status)}

                      {doc.status === "not_started" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openUploadDialog(doc)}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          {t("upload")}
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openReviewDialog(doc._id)}
                            title={t("viewDetails")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openHistoryDialog(doc.documentTypeId, doc.documentRequirementId)}
                            title={t("viewHistory")}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {documents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t("noDocuments")}</p>
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      {dialogs.upload.open && dialogs.upload.document && (
        <DocumentUploadDialog
          open={dialogs.upload.open}
          onOpenChange={(open) => {
            if (!open) closeAllDialogs()
          }}
          individualProcessId={individualProcessId}
          documentTypeId={dialogs.upload.document.documentTypeId}
          documentRequirementId={dialogs.upload.document.documentRequirementId}
          documentInfo={{
            name: dialogs.upload.document.documentType?.name || "",
            description: dialogs.upload.document.documentRequirement?.description,
            maxSizeMB: dialogs.upload.document.documentRequirement?.maxSizeMB,
            allowedFormats: dialogs.upload.document.documentRequirement?.allowedFormats,
          }}
          onSuccess={closeAllDialogs}
        />
      )}

      {dialogs.review.open && dialogs.review.documentId && (
        <DocumentReviewDialog
          open={dialogs.review.open}
          onOpenChange={(open) => {
            if (!open) closeAllDialogs()
          }}
          documentId={dialogs.review.documentId}
          onSuccess={closeAllDialogs}
        />
      )}

      {dialogs.history.open && dialogs.history.documentTypeId && (
        <DocumentHistoryDialog
          open={dialogs.history.open}
          onOpenChange={(open) => {
            if (!open) closeAllDialogs()
          }}
          individualProcessId={individualProcessId}
          documentTypeId={dialogs.history.documentTypeId}
          documentRequirementId={dialogs.history.documentRequirementId || undefined}
        />
      )}
    </Card>
  )
}
