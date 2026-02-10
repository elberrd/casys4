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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  AlertTriangle,
  Eye,
  History,
  FileQuestion,
  FileType,
  Plus,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DocumentUploadDialog } from "./document-upload-dialog"
import { DocumentReviewDialog } from "./document-review-dialog"
import { DocumentHistoryDialog } from "./document-history-dialog"
import { UploadNewVersionDialog } from "./upload-new-version-dialog"
import { BulkDocumentActionsMenu } from "./bulk-document-actions-menu"
import { LooseDocumentUploadDialog } from "./loose-document-upload-dialog"
import { TypedDocumentUploadDialog } from "./typed-document-upload-dialog"
import { AssignDocumentTypeDialog } from "./assign-document-type-dialog"

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
  uploadNewVersion: {
    open: boolean
    document: {
      individualProcessId: Id<"individualProcesses">
      documentTypeId: Id<"documentTypes">
      documentRequirementId?: Id<"documentRequirements">
      currentVersion: number
      currentFileName: string
      currentFileSize: number
      currentStatus: string
    } | null
  }
  looseUpload: { open: boolean }
  typedUpload: { open: boolean }
  assignType: {
    open: boolean
    document: {
      id: Id<"documentsDelivered">
      fileName: string
      fileSize: number
      mimeType: string
    } | null
  }
}

export function DocumentChecklistCard({
  individualProcessId,
  userRole = "client"
}: DocumentChecklistCardProps) {
  const t = useTranslations("DocumentChecklist")
  const tCommon = useTranslations("Common")

  // Use the new grouped query
  const groupedDocuments = useQuery(api.documentsDelivered.listGroupedByCategory, {
    individualProcessId,
  })

  // Also get the regular list for bulk operations (fallback if grouped not available)
  const documents = useQuery(api.documentsDelivered.list, {
    individualProcessId,
  })

  const [dialogs, setDialogs] = useState<DialogState>({
    upload: { open: false, document: null },
    review: { open: false, documentId: null },
    history: { open: false, documentTypeId: null, documentRequirementId: null },
    uploadNewVersion: { open: false, document: null },
    looseUpload: { open: false },
    typedUpload: { open: false },
    assignType: { open: false, document: null },
  })

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<Id<"documentsDelivered">>>(new Set())

  const openUploadDialog = (doc: any) => {
    setDialogs(prev => ({ ...prev, upload: { open: true, document: doc } }))
  }

  const openReviewDialog = (documentId: Id<"documentsDelivered">) => {
    setDialogs(prev => ({ ...prev, review: { open: true, documentId } }))
  }

  const openHistoryDialog = (
    documentTypeId: Id<"documentTypes"> | undefined,
    documentRequirementId?: Id<"documentRequirements">
  ) => {
    if (!documentTypeId) return
    setDialogs(prev => ({
      ...prev,
      history: {
        open: true,
        documentTypeId,
        documentRequirementId: documentRequirementId || null,
      },
    }))
  }

  const openLooseUploadDialog = () => {
    setDialogs(prev => ({ ...prev, looseUpload: { open: true } }))
  }

  const openTypedUploadDialog = () => {
    setDialogs(prev => ({ ...prev, typedUpload: { open: true } }))
  }

  const openAssignTypeDialog = (doc: any) => {
    setDialogs(prev => ({
      ...prev,
      assignType: {
        open: true,
        document: {
          id: doc._id,
          fileName: doc.fileName || "",
          fileSize: doc.fileSize || 0,
          mimeType: doc.mimeType || "",
        },
      },
    }))
  }

  const openUploadNewVersionDialog = (doc: any) => {
    setDialogs(prev => ({
      ...prev,
      uploadNewVersion: {
        open: true,
        document: {
          individualProcessId,
          documentTypeId: doc.documentTypeId,
          documentRequirementId: doc.documentRequirementId,
          currentVersion: doc.version || 1,
          currentFileName: doc.fileName || "",
          currentFileSize: doc.fileSize || 0,
          currentStatus: doc.status,
        },
      },
    }))
  }

  const closeAllDialogs = () => {
    setDialogs({
      upload: { open: false, document: null },
      review: { open: false, documentId: null },
      history: { open: false, documentTypeId: null, documentRequirementId: null },
      uploadNewVersion: { open: false, document: null },
      looseUpload: { open: false },
      typedUpload: { open: false },
      assignType: { open: false, document: null },
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

  if (groupedDocuments === undefined || documents === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{tCommon("loading")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { required, optional, loose, summary } = groupedDocuments

  // Derived summary values for UI
  const requiredCompleted = summary.requiredApproved
  const requiredTotal = summary.totalRequired
  const total = summary.totalRequired + summary.totalOptional + summary.totalLoose

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

  // Render a single document row
  const renderDocumentRow = (doc: any, showCritical = false, isLoose = false) => (
    <div
      key={doc._id}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
        showCritical && doc.isRequired && "border-primary/50",
        selectedDocumentIds.has(doc._id) && "ring-2 ring-primary"
      )}
      onClick={() => {
        // Open review dialog for documents that have been uploaded
        if (doc.status !== "not_started") {
          openReviewDialog(doc._id)
        }
      }}
    >
      <div className="flex items-center gap-3 flex-1">
        {doc.status !== "not_started" && (
          <Checkbox
            checked={selectedDocumentIds.has(doc._id)}
            onCheckedChange={() => toggleDocumentSelection(doc._id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${doc.documentType?.name || doc.fileName}`}
          />
        )}
        {isLoose ? (
          <FileQuestion className="h-5 w-5 text-muted-foreground" />
        ) : (
          getStatusIcon(doc.status)
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {doc.documentType?.name || doc.fileName || t("looseDocument")}
            </p>
            {showCritical && doc.isRequired && (
              <Badge variant="default" className="text-xs">
                {t("required")}
              </Badge>
            )}
            {isLoose && (
              <Badge variant="outline" className="text-xs gap-1">
                <FileQuestion className="h-3 w-3" />
                {t("looseDocument")}
              </Badge>
            )}
          </div>
          {doc.documentType?.description && !isLoose && (
            <p className="text-xs text-muted-foreground truncate">
              {doc.documentType.description}
            </p>
          )}
          {doc.fileName && (
            <p className="text-xs text-muted-foreground truncate mt-1">
              {doc.fileName}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-3" onClick={(e) => e.stopPropagation()}>
        {getStatusBadge(doc.status)}

        {/* Validity badges */}
        {doc.validityCheck && doc.validityCheck.status === "expired" && (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {t("validity.expired")}
          </Badge>
        )}
        {doc.validityCheck && doc.validityCheck.status === "expiring_soon" && (
          <Badge variant="warning" className="gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {t("validity.expiringSoon", { days: doc.validityCheck.daysValue })}
          </Badge>
        )}
        {doc.validityCheck && doc.validityCheck.status === "missing_date" && (
          <Badge variant="outline" className="gap-1 text-xs">
            {t("validity.missingDate")}
          </Badge>
        )}

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
              className="cursor-pointer"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {doc.documentTypeId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openHistoryDialog(doc.documentTypeId, doc.documentRequirementId)}
                title={t("viewHistory")}
                className="cursor-pointer"
              >
                <History className="h-4 w-4" />
              </Button>
            )}
            {doc.documentTypeId && userRole === "admin" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openUploadNewVersionDialog(doc)}
                title={t("uploadNewVersion")}
                className="cursor-pointer"
              >
                <Upload className="h-4 w-4" />
              </Button>
            )}
            {isLoose && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openAssignTypeDialog(doc)}
                title={t("assignType")}
              >
                <FileType className="h-4 w-4 mr-1" />
                {t("assignType")}
              </Button>
            )}
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
  )

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
                {requiredCompleted} / {requiredTotal} {t("completed")}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2">{t("description")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedDocuments.length > 0 && (
              <BulkDocumentActionsMenu
                selectedDocuments={selectedDocuments.map(doc => ({
                  _id: doc._id,
                  fileName: doc.fileName,
                  fileUrl: doc.fileUrl,
                  status: doc.status,
                  documentType: doc.documentType ? { name: doc.documentType.name } : undefined,
                }))}
                onSuccess={handleBulkActionSuccess}
                userRole={userRole}
              />
            )}
            {/* Upload dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  {t("addDocument")}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openLooseUploadDialog}>
                  <FileQuestion className="h-4 w-4 mr-2" />
                  {t("uploadLoose")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openTypedUploadDialog}>
                  <FileType className="h-4 w-4 mr-2" />
                  {t("uploadWithType")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress bar */}
        {requiredTotal > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("progress")}</span>
              <span className="font-medium">
                {Math.round((requiredCompleted / requiredTotal) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(requiredCompleted / requiredTotal) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Required Documents */}
        {required.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {t("requiredDocuments")}
              <Badge variant="secondary" className="ml-auto">
                {required.filter(d => d.status === "approved").length} / {required.length}
              </Badge>
            </h3>
            <div className="space-y-2">
              {required.map((doc) => renderDocumentRow(doc, true))}
            </div>
          </div>
        )}

        {/* Optional Documents */}
        {optional.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("optionalDocuments")}
                <Badge variant="outline" className="ml-auto">
                  {optional.filter(d => d.status === "approved").length} / {optional.length}
                </Badge>
              </h3>
              <div className="space-y-2">
                {optional.map((doc) => renderDocumentRow(doc))}
              </div>
            </div>
          </>
        )}

        {/* Loose Documents */}
        {loose.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <FileQuestion className="h-4 w-4" />
                {t("looseDocuments")}
                <Badge variant="outline" className="ml-auto">
                  {loose.length}
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("looseDocumentsDescription")}
              </p>
              <div className="space-y-2">
                {loose.map((doc) => renderDocumentRow(doc, false, true))}
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {total === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t("noDocuments")}</p>
            <p className="text-xs mt-2">{t("noDocumentsHint")}</p>
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={openLooseUploadDialog}>
                <FileQuestion className="h-4 w-4 mr-1" />
                {t("uploadLoose")}
              </Button>
              <Button variant="outline" size="sm" onClick={openTypedUploadDialog}>
                <FileType className="h-4 w-4 mr-1" />
                {t("uploadWithType")}
              </Button>
            </div>
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
            description: dialogs.upload.document.documentType?.description,
            maxSizeMB: dialogs.upload.document.documentType?.maxFileSizeMB,
            allowedFormats: dialogs.upload.document.documentType?.allowedFileTypes,
          }}
          validityRule={dialogs.upload.document.validityRule}
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
          userRole={userRole}
        />
      )}

      {dialogs.uploadNewVersion.open && dialogs.uploadNewVersion.document && (
        <UploadNewVersionDialog
          open={dialogs.uploadNewVersion.open}
          onOpenChange={(open) => {
            if (!open) closeAllDialogs()
          }}
          individualProcessId={dialogs.uploadNewVersion.document.individualProcessId}
          documentTypeId={dialogs.uploadNewVersion.document.documentTypeId}
          documentRequirementId={dialogs.uploadNewVersion.document.documentRequirementId}
          currentVersion={dialogs.uploadNewVersion.document.currentVersion}
          currentFileName={dialogs.uploadNewVersion.document.currentFileName}
          currentFileSize={dialogs.uploadNewVersion.document.currentFileSize}
          currentStatus={dialogs.uploadNewVersion.document.currentStatus}
          onSuccess={closeAllDialogs}
        />
      )}

      <LooseDocumentUploadDialog
        open={dialogs.looseUpload.open}
        onOpenChange={(open) => {
          if (!open) closeAllDialogs()
        }}
        individualProcessId={individualProcessId}
        onSuccess={closeAllDialogs}
      />

      <TypedDocumentUploadDialog
        open={dialogs.typedUpload.open}
        onOpenChange={(open) => {
          if (!open) closeAllDialogs()
        }}
        individualProcessId={individualProcessId}
        onSuccess={closeAllDialogs}
      />

      {dialogs.assignType.open && dialogs.assignType.document && (
        <AssignDocumentTypeDialog
          open={dialogs.assignType.open}
          onOpenChange={(open) => {
            if (!open) closeAllDialogs()
          }}
          document={dialogs.assignType.document}
          onSuccess={closeAllDialogs}
        />
      )}
    </Card>
  )
}
