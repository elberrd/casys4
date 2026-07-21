"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useLocale, useTranslations } from "next-intl"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Trash2,
  Building2,
  RotateCcw,
  ListChecks,
  Check,
  X,
  Link2,
  EyeOff,
  ShieldOff,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { DocumentUploadDialog } from "./document-upload-dialog"
import { DocumentReviewDialog } from "./document-review-dialog"
import { DocumentHistoryDialog } from "./document-history-dialog"
import { UploadNewVersionDialog } from "./upload-new-version-dialog"
import { BulkDocumentActionsMenu } from "./bulk-document-actions-menu"
import { LooseDocumentUploadDialog } from "./loose-document-upload-dialog"
import { TypedDocumentUploadDialog } from "./typed-document-upload-dialog"
import { AssignDocumentTypeDialog } from "./assign-document-type-dialog"
import { CompanyDocumentReuseDialog } from "./company-document-reuse-dialog"
import { RequirementsChecklistSheet, ChecklistTriggerButton } from "./requirements-checklist-card"
import { InformationFieldsDialog } from "./information-fields-dialog"
import { PendingDocumentUploadDialog } from "./pending-document-upload-dialog"
import { SelectExistingDocumentDialog } from "./select-existing-document-dialog"
import { PendingDocumentsPdfDialog } from "./pending-documents-pdf-dialog"
import { StatusDocumentsDialog } from "./status-documents-dialog"
import { DocumentWaitTimeBadge } from "./document-wait-time-badge"
import type {
  PdfReportMode,
  ProcessInfoForReport,
  PdfDocumentItem,
  PdfDocumentWithConditions,
  PdfExigenciaGroup,
} from "@/lib/utils/pdf-report-helpers"

interface DocumentChecklistCardProps {
  individualProcessId: Id<"individualProcesses">
  userRole?: "admin" | "client"
  processInfo?: ProcessInfoForReport
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
  reuse: {
    open: boolean
    document: {
      targetDocumentId: Id<"documentsDelivered">
      documentTypeId: Id<"documentTypes">
      documentTypeName: string
    } | null
  }
  informationFields: {
    open: boolean
    document: {
      documentTypeId: Id<"documentTypes">
      documentRequirementId?: Id<"documentRequirements">
      documentTypeLegalFrameworkId?: Id<"documentTypesLegalFrameworks">
      documentTypeName: string
    } | null
  }
  pendingUpload: {
    open: boolean
    documentId: Id<"documentsDelivered"> | null
    documentName: string
    existingVersionNotes?: string
    documentCreatedAt?: number
  }
  selectExisting: { open: boolean }
}

export function DocumentChecklistCard({
  individualProcessId,
  userRole = "client",
  processInfo,
}: DocumentChecklistCardProps) {
  const t = useTranslations("DocumentChecklist")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const removeDocument = useMutation(api.documentsDelivered.remove)
  const linkPendingToLatestExigencia = useMutation(
    api.documentsDelivered.linkPendingToLatestExigencia,
  )

  // Use the new grouped query
  const groupedDocuments = useQuery(api.documentsDelivered.listGroupedByCategory, {
    individualProcessId,
  })

  type ChecklistDocument = NonNullable<
    typeof groupedDocuments
  >["required"][number]

  // Also get the regular list for bulk operations (fallback if grouped not available)
  const documents = useQuery(api.documentsDelivered.list, {
    individualProcessId,
  })

  const documentVersionsByProgress = useQuery(
    api.documentsDelivered.listVersionsByProgress,
    userRole === "admin" ? { individualProcessId } : "skip",
  )

  type DocumentVersionByProgress = NonNullable<
    typeof documentVersionsByProgress
  >[number]

  type ProgressDocumentGroup = {
    key: string
    processStatusAtUpload: DocumentVersionByProgress["processStatusAtUpload"]
    documents: DocumentVersionByProgress[]
    latestUploadedAt: number
    isWithoutProgress: boolean
  }

  const progressDocumentGroups = useMemo<ProgressDocumentGroup[]>(() => {
    if (!documentVersionsByProgress) return []

    const groups = new Map<string, ProgressDocumentGroup>()

    for (const document of documentVersionsByProgress) {
      const snapshot = document.processStatusAtUpload
      const key = snapshot
        ? snapshot.individualProcessStatusId
          ? `status-entry:${snapshot.individualProcessStatusId}`
          : snapshot.caseStatusId
            ? `case-status:${snapshot.caseStatusId}`
            : `snapshot:${snapshot.code}:${snapshot.name}:${snapshot.nameEn ?? ""}:${snapshot.category ?? ""}`
        : "without-progress"

      const existingGroup = groups.get(key)
      if (existingGroup) {
        existingGroup.documents.push(document)
        existingGroup.latestUploadedAt = Math.max(
          existingGroup.latestUploadedAt,
          document.uploadedAt,
        )
        continue
      }

      groups.set(key, {
        key,
        processStatusAtUpload: snapshot,
        documents: [document],
        latestUploadedAt: document.uploadedAt,
        isWithoutProgress: snapshot === undefined,
      })
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        documents: [...group.documents].sort(
          (a, b) => b.uploadedAt - a.uploadedAt || b.version - a.version,
        ),
      }))
      .sort((a, b) => {
        if (a.isWithoutProgress !== b.isWithoutProgress) {
          return a.isWithoutProgress ? 1 : -1
        }
        return b.latestUploadedAt - a.latestUploadedAt
      })
  }, [documentVersionsByProgress])

  // Check which document types have reusable company documents
  const reusableTypeIds = useQuery(
    api.documentsDelivered.getReusableDocumentTypeIds,
    userRole === "admin" && groupedDocuments?.companyApplicantId
      ? { companyApplicantId: groupedDocuments.companyApplicantId, excludeProcessId: individualProcessId }
      : "skip"
  )
  const reusableTypeIdSet = useMemo(
    () => new Set(reusableTypeIds ?? []),
    [reusableTypeIds]
  )

  const [dialogs, setDialogs] = useState<DialogState>({
    upload: { open: false, document: null },
    review: { open: false, documentId: null },
    history: { open: false, documentTypeId: null, documentRequirementId: null },
    uploadNewVersion: { open: false, document: null },
    looseUpload: { open: false },
    typedUpload: { open: false },
    assignType: { open: false, document: null },
    reuse: { open: false, document: null },
    informationFields: { open: false, document: null },
    pendingUpload: { open: false, documentId: null, documentName: "" },
    selectExisting: { open: false },
  })

  // Check if process has exigencia statuses (for "Select Existing" button)
  const statusHistory = useQuery(api.individualProcessStatuses.getStatusHistory, {
    individualProcessId,
  })
  const hasExigencia = useMemo(
    () => statusHistory?.some((s) => s.caseStatus?.code === "exigencia") ?? false,
    [statusHistory]
  )

  const latestExigencia = useMemo(() => {
    const latestStatus = statusHistory?.[0]
    if (latestStatus?.caseStatus?.code !== "exigencia") return null

    const statusDate = latestStatus.date ?? new Date(latestStatus.changedAt).toISOString()
    const datePattern = statusDate.includes("T")
      ? locale === "pt" ? "dd/MM/yyyy 'às' HH:mm" : "MM/dd/yyyy 'at' HH:mm"
      : locale === "pt" ? "dd/MM/yyyy" : "MM/dd/yyyy"

    let displayDate = statusDate
    try {
      displayDate = format(parseISO(statusDate), datePattern)
    } catch {
      // Keep the original value if a legacy date cannot be parsed.
    }

    return {
      statusId: latestStatus._id,
      caseStatusName: locale === "pt"
        ? latestStatus.caseStatus.name
        : latestStatus.caseStatus.nameEn || latestStatus.caseStatus.name,
      caseStatusColor: latestStatus.caseStatus.color,
      caseStatusCode: latestStatus.caseStatus.code,
      displayDate,
    }
  }, [locale, statusHistory])

  type LatestExigencia = NonNullable<typeof latestExigencia>
  type PendingDocumentIntent = "row" | "upload"

  const [addDocumentMenuOpen, setAddDocumentMenuOpen] = useState(false)
  const [latestExigenciaPromptOpen, setLatestExigenciaPromptOpen] = useState(false)
  const [latestExigenciaDocumentsOpen, setLatestExigenciaDocumentsOpen] = useState(false)
  const [pendingExigenciaInteraction, setPendingExigenciaInteraction] = useState<{
    document: ChecklistDocument
    intent: PendingDocumentIntent
    exigencia: LatestExigencia
  } | null>(null)
  const [isLinkingPendingToExigencia, setIsLinkingPendingToExigencia] = useState(false)

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<Id<"documentsDelivered">>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    documentId: Id<"documentsDelivered"> | null
    documentName: string
  }>({ open: false, documentId: null, documentName: "" })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBulkReusing, setIsBulkReusing] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [pdfReportMode, setPdfReportMode] = useState<PdfReportMode | null>(null)
  const bulkReuse = useMutation(api.documentsDelivered.bulkReuseCompanyDocuments)
  const toggleExcludeFromReportMutation = useMutation(api.documentsDelivered.toggleExcludeFromReport)
  const bulkExcludeFromReportByDefaultMutation = useMutation(api.documentsDelivered.bulkExcludeFromReportByDefault)

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

  const handleAddDocumentMenuOpenChange = (open: boolean) => {
    if (!open) {
      setAddDocumentMenuOpen(false)
      return
    }

    if (statusHistory === undefined) return

    if (latestExigencia) {
      setLatestExigenciaPromptOpen(true)
      return
    }

    setAddDocumentMenuOpen(true)
  }

  const handleAddOutsideLatestExigencia = () => {
    setLatestExigenciaPromptOpen(false)
    setAddDocumentMenuOpen(true)
  }

  const handleOpenLatestExigenciaDocuments = () => {
    setLatestExigenciaPromptOpen(false)
    setLatestExigenciaDocumentsOpen(true)
  }

  const openReuseDialog = (doc: any) => {
    if (!doc.documentTypeId) return
    setDialogs(prev => ({
      ...prev,
      reuse: {
        open: true,
        document: {
          targetDocumentId: doc._id,
          documentTypeId: doc.documentTypeId,
          documentTypeName: doc.documentType?.name || "",
        },
      },
    }))
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
          currentVersion: doc.version ?? 0,
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
      reuse: { open: false, document: null },
      informationFields: { open: false, document: null },
      pendingUpload: { open: false, documentId: null, documentName: "" },
      selectExisting: { open: false },
    })
  }

  const openInformationFieldsDialog = (doc: any) => {
    setDialogs(prev => ({
      ...prev,
      informationFields: {
        open: true,
        document: {
          documentTypeId: doc.documentTypeId,
          documentRequirementId: doc.documentRequirementId,
          documentTypeLegalFrameworkId: doc.documentTypeLegalFrameworkId,
          documentTypeName: doc.documentType?.name || "",
        },
      },
    }))
  }

  const openPendingUploadDialog = (doc: any) => {
    setDialogs(prev => ({
      ...prev,
      pendingUpload: {
        open: true,
        documentId: doc._id,
        documentName: doc.documentType?.name || doc.documentName || doc.fileName || t("looseDocument"),
        existingVersionNotes: doc.versionNotes,
        documentCreatedAt: doc.createdAt ?? doc._creationTime,
      },
    }))
  }

  const continueDocumentInteraction = (
    doc: ChecklistDocument,
    intent: PendingDocumentIntent,
  ) => {
    if (doc.documentType?.isInformationOnly) {
      openInformationFieldsDialog(doc)
      return
    }

    if (intent === "upload" || (doc.status === "not_started" && (doc.version ?? 0) <= 1)) {
      if (doc.documentTypeId) {
        openUploadDialog(doc)
      } else {
        openPendingUploadDialog(doc)
      }
      return
    }

    openReviewDialog(doc._id)
  }

  const handleDocumentInteraction = (
    doc: ChecklistDocument,
    intent: PendingDocumentIntent,
  ) => {
    const isPendingWithoutAttachment =
      doc.status === "not_started" &&
      doc.isLatest === true &&
      doc.storageId === undefined &&
      doc.fileUrl.trim() === "" &&
      doc.documentType?.isInformationOnly !== true

    if (isPendingWithoutAttachment) {
      if (statusHistory === undefined) return

      if (
        latestExigencia &&
        doc.individualProcessStatusId !== latestExigencia.statusId
      ) {
        setPendingExigenciaInteraction({
          document: doc,
          intent,
          exigencia: latestExigencia,
        })
        return
      }
    }

    continueDocumentInteraction(doc, intent)
  }

  const handleContinueOutsideLatestExigencia = () => {
    if (!pendingExigenciaInteraction) return

    const { document, intent } = pendingExigenciaInteraction
    setPendingExigenciaInteraction(null)
    continueDocumentInteraction(document, intent)
  }

  const handleLinkPendingToLatestExigencia = async () => {
    if (!pendingExigenciaInteraction) return

    const { document, exigencia } = pendingExigenciaInteraction
    setIsLinkingPendingToExigencia(true)

    try {
      await linkPendingToLatestExigencia({
        documentId: document._id,
        individualProcessStatusId: exigencia.statusId,
      })
      toast.success(t("pendingExigenciaLinkSuccess"))
      setPendingExigenciaInteraction(null)
      continueDocumentInteraction(document, "upload")
    } catch {
      toast.error(t("pendingExigenciaLinkError"))
    } finally {
      setIsLinkingPendingToExigencia(false)
    }
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

  const handleDeleteDocument = async () => {
    if (!deleteConfirm.documentId) return
    setIsDeleting(true)
    try {
      await removeDocument({ id: deleteConfirm.documentId })
      toast.success(t("deleteDocumentSuccess"))
      setDeleteConfirm({ open: false, documentId: null, documentName: "" })
    } catch (error) {
      toast.error(t("deleteDocumentError"))
    } finally {
      setIsDeleting(false)
    }
  }

  // Count how many pending company docs can be bulk-reused
  const pendingReusableCount = useMemo(() => {
    if (!groupedDocuments) return 0
    const { required, optional, companyApplicantId } = groupedDocuments
    if (!companyApplicantId || reusableTypeIdSet.size === 0) return 0
    const allDocs = [...required, ...optional]
    return allDocs.filter(
      (doc) =>
        doc.status === "not_started" &&
        doc.documentType?.isCompanyDocument === true &&
        doc.documentTypeId &&
        reusableTypeIdSet.has(doc.documentTypeId)
    ).length
  }, [groupedDocuments, reusableTypeIdSet])

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

  const { required, optional, loose, summary, companyApplicantId } = groupedDocuments

  // Derived summary values for UI
  const requiredCompleted = summary.requiredApproved
  const requiredTotal = summary.totalRequired
  const checklistDocuments = [...required, ...optional, ...loose]
  const total = checklistDocuments.length

  // Separate exigência documents from normal documents
  const exigenciaDocuments = checklistDocuments.filter(
    (doc) => doc.linkedStatus?.caseStatusCode === "exigencia"
  )
  const nonExigenciaDocuments = checklistDocuments.filter(
    (doc) => doc.linkedStatus?.caseStatusCode !== "exigencia"
  )
  const filledDocuments = nonExigenciaDocuments.filter((doc) => doc.status !== "not_started")
  const unfilledDocuments = nonExigenciaDocuments.filter((doc) => doc.status === "not_started")

  // Group exigência documents by their individualProcessStatusId
  const exigenciaGroups = (() => {
    const groups = new Map<string, { date: string; caseStatusName: string; caseStatusColor?: string; clientDeadlineDate?: string; docs: typeof exigenciaDocuments }>()
    for (const doc of exigenciaDocuments) {
      const statusId = doc.linkedStatus!.individualProcessStatusId
      if (!groups.has(statusId)) {
        groups.set(statusId, {
          date: doc.linkedStatus!.date || "",
          caseStatusName: doc.linkedStatus!.caseStatusName,
          caseStatusColor: doc.linkedStatus!.caseStatusColor,
          clientDeadlineDate: doc.linkedStatus!.clientDeadlineDate,
          docs: [],
        })
      }
      groups.get(statusId)!.docs.push(doc)
    }
    // Sort by date descending (newest first)
    return Array.from(groups.entries()).sort((a, b) => b[1].date.localeCompare(a[1].date))
  })()

  const handleBulkReuse = async () => {
    setIsBulkReusing(true)
    try {
      const count = await bulkReuse({ individualProcessId })
      toast.success(t("bulkReuseSuccess", { count }))
    } catch (error) {
      toast.error(t("bulkReuseError"))
    } finally {
      setIsBulkReusing(false)
    }
  }

  // Build PDF-eligible data (pending + exigencia docs minus excluded)
  const pdfPendingDocuments: PdfDocumentItem[] = unfilledDocuments
    .filter((doc) => !doc.excludedFromReport)
    .map((doc) => ({
      id: doc._id,
      name: doc.documentType?.name || doc.documentName || doc.fileName || t("looseDocument"),
      isRequired: !!doc.isRequired,
      isCompanyDocument: doc.documentType?.isCompanyDocument === true,
      responsibleParty: (doc as any).responsibleParty,
      versionNotes: doc.versionNotes,
    }))

  const pdfExigenciaGroups: PdfExigenciaGroup[] = exigenciaGroups
    .map(([, group]) => ({
      date: group.date ? format(parseISO(group.date), "dd/MM/yyyy HH:mm") : "",
      statusName: group.caseStatusName,
      clientDeadlineDate: group.clientDeadlineDate,
      documents: group.docs
        .filter((doc) => !doc.excludedFromReport)
        .map((doc) => ({
          id: doc._id,
          name: doc.documentType?.name || doc.documentName || doc.fileName || t("looseDocument"),
          isRequired: !!doc.isRequired,
          isCompanyDocument: doc.documentType?.isCompanyDocument === true,
          responsibleParty: (doc as any).responsibleParty,
          versionNotes: doc.versionNotes,
          exigenciaReason: doc.previousRejectionReason,
        })),
    }))
    .filter((g) => g.documents.length > 0)

  // Collect non-approved received documents with unfulfilled conditions
  const pdfDocumentsWithUnfulfilledConditions: PdfDocumentWithConditions[] = filledDocuments
    .filter((doc) => {
      if (doc.status === "approved") return false
      if (doc.excludedFromReport) return false
      if (doc.bypassConditions) return false
      if (!doc.conditionsSummary) return false
      return doc.conditionsSummary.fulfilled < doc.conditionsSummary.total
    })
    .map((doc) => {
      const unfulfilled = doc.conditionsSummary!.conditions
        .filter((c: { name: string; isFulfilled: boolean }) => !c.isFulfilled)
        .map((c: { name: string; isFulfilled: boolean }) => c.name)
      const statusLabels: Record<string, string> = {
        uploaded: t("status.uploaded"),
        under_review: t("status.underReview"),
        rejected: t("status.rejected"),
      }
      return {
        id: doc._id,
        name: doc.documentType?.name || doc.documentName || doc.fileName || t("looseDocument"),
        status: doc.status,
        statusLabel: statusLabels[doc.status] || doc.status,
        isCompanyDocument: doc.documentType?.isCompanyDocument === true,
        unfulfilledConditions: unfulfilled,
      }
    })

  const pdfEligibleCount = pdfPendingDocuments.length + pdfExigenciaGroups.reduce((sum, g) => sum + g.documents.length, 0) + pdfDocumentsWithUnfulfilledConditions.length

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
        "flex cursor-pointer flex-col gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between",
        showCritical && doc.isRequired && "border-primary/50",
        selectedDocumentIds.has(doc._id) && "ring-2 ring-primary"
      )}
      onClick={() => {
        if (userRole !== "admin") {
          if (doc.status !== "not_started") {
            openReviewDialog(doc._id)
          }
          return
        }
        handleDocumentInteraction(doc, "row")
      }}
    >
      <div className="flex w-full flex-1 items-start gap-3 sm:items-center">
        {userRole === "admin" && doc.status !== "not_started" && (
          <Checkbox
            checked={selectedDocumentIds.has(doc._id)}
            onCheckedChange={() => toggleDocumentSelection(doc._id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${doc.documentType?.name || doc.documentName || doc.fileName}`}
          />
        )}
        {isLoose ? (
          <FileQuestion className="h-5 w-5 text-muted-foreground" />
        ) : (
          getStatusIcon(doc.status)
        )}
        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug [overflow-wrap:anywhere]">
              {doc.documentType?.name || doc.documentName || doc.fileName || t("looseDocument")}
            </p>
            {userRole === "admin" && (
              <DocumentWaitTimeBadge document={doc} />
            )}
            {showCritical && doc.isRequired && (
              <Badge variant="default" className="text-xs">
                {t("required")}
              </Badge>
            )}
            {doc.documentType?.isCompanyDocument === true && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Building2 className="h-3 w-3" />
                {t("companyDocument")}
              </Badge>
            )}
            {doc.documentType?.isInformationOnly === true && (
              <Badge variant="secondary" className="text-xs gap-1">
                <FileText className="h-3 w-3" />
                {t("informationOnly")}
              </Badge>
            )}
            {doc.linkedStatus && (
              <Badge
                variant="outline"
                className="text-xs gap-1"
                style={doc.linkedStatus.caseStatusColor ? {
                  borderColor: doc.linkedStatus.caseStatusColor,
                  color: doc.linkedStatus.caseStatusColor,
                } : undefined}
              >
                {doc.linkedStatus.caseStatusName}
                {doc.linkedStatus.date && ` - ${format(parseISO(doc.linkedStatus.date), "dd/MM/yyyy HH:mm")}`}
              </Badge>
            )}
            {isLoose && (
              <Badge variant="outline" className="text-xs gap-1">
                <FileQuestion className="h-3 w-3" />
                {t("looseDocument")}
              </Badge>
            )}
          </div>
          {doc.documentType?.description && !isLoose && !doc.documentType?.isInformationOnly && (
            <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {doc.documentType.description}
            </p>
          )}
          {doc.versionNotes && (
            <p className="mt-1 text-xs text-muted-foreground italic [overflow-wrap:anywhere]">
              {doc.versionNotes}
            </p>
          )}
          {doc.documentType?.isInformationOnly && doc.infoFieldValues && doc.infoFieldValues.length > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {doc.infoFieldValues.join(" · ")}
            </p>
          ) : doc.fileName && doc.fileName !== "information_only" && doc.fileName !== (doc.documentType?.name || doc.documentName) && (
            <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {doc.fileName}
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-3 sm:w-auto sm:justify-end" onClick={(e) => e.stopPropagation()}>
        {getStatusBadge(doc.status)}

        {/* Exclude from PDF report checkbox (admin only) */}
        {userRole === "admin" && processInfo && (doc.status === "not_started" || doc.linkedStatus?.caseStatusCode === "exigencia") && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Checkbox
                  checked={doc.excludedFromReport === true}
                  onCheckedChange={() => toggleExcludeFromReportMutation({ documentId: doc._id })}
                  onClick={(e) => e.stopPropagation()}
                  className="h-3.5 w-3.5"
                  aria-label={t("excludeFromReport")}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{t("excludeFromReport")}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Illegible badge */}
        {doc.isIllegible && doc.status === "rejected" && (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {t("illegible")}
          </Badge>
        )}

        {/* Conditions badge */}
        {doc.bypassConditions && doc.conditionsSummary ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="gap-1 text-xs cursor-default border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
              >
                <ShieldOff className="h-3 w-3" />
                {t("conditions.bypassed")}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{t("conditionsBypassed")}</p>
            </TooltipContent>
          </Tooltip>
        ) : doc.conditionsSummary && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-xs cursor-default",
                  doc.conditionsSummary.fulfilled === doc.conditionsSummary.total
                    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                    : doc.conditionsSummary.fulfilled > 0
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                )}
              >
                <ListChecks className="h-3 w-3" />
                {doc.conditionsSummary.fulfilled}/{doc.conditionsSummary.total}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px]">
              <p className="font-medium text-xs mb-1">{t("conditions.title")}</p>
              <ul className="space-y-0.5">
                {doc.conditionsSummary.conditions.map((c: { name: string; isFulfilled: boolean }, i: number) => (
                  <li key={i} className="flex items-center gap-1 text-xs">
                    {c.isFulfilled ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground" />
                    )}
                    {c.name}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}

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
          <div className="flex flex-wrap gap-1">
            {userRole === "admin" && doc.documentType?.isCompanyDocument === true && companyApplicantId && doc.documentTypeId && reusableTypeIdSet.has(doc.documentTypeId) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openReuseDialog(doc)}
                title={t("reuseExisting")}
                className="cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {userRole === "admin" && (doc.documentTypeId ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDocumentInteraction(doc, "upload")}
                title={doc.documentType?.isInformationOnly ? t("fillInformation") : t("upload")}
                className="cursor-pointer"
              >
                {doc.documentType?.isInformationOnly ? <FileText className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDocumentInteraction(doc, "upload")}
                title={t("upload")}
                className="cursor-pointer"
              >
                <Upload className="h-4 w-4" />
              </Button>
            ))}
            {userRole === "admin" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteConfirm({
                  open: true,
                  documentId: doc._id,
                  documentName: doc.documentType?.name || doc.documentName || doc.fileName || t("looseDocument"),
                })}
                title={t("deleteDocument")}
                className="cursor-pointer text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openReviewDialog(doc._id)}
              title={t("viewDetails")}
              className="cursor-pointer"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {doc.documentTypeId && !doc.documentType?.isInformationOnly && (
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
            {doc.documentTypeId && userRole === "admin" && !doc.documentType?.isInformationOnly && (
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
            {userRole === "admin" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteConfirm({
                  open: true,
                  documentId: doc._id,
                  documentName: doc.documentType?.name || doc.documentName || doc.fileName || t("looseDocument"),
                })}
                title={t("deleteDocument")}
                className="cursor-pointer text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {isLoose && userRole === "admin" && (
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
            {doc.status === "rejected" && userRole === "admin" && (
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
      <Tabs defaultValue="documents">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <CardTitle className="flex flex-wrap items-center gap-3">
                {userRole === "admin" && selectableDocs.length > 0 && (
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
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {userRole === "admin" && selectedDocuments.length > 0 && (
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
            {/* Bulk reuse company documents (admin only) */}
            {userRole === "admin" && pendingReusableCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkReuse}
                disabled={isBulkReusing}
                className="gap-1"
              >
                <RotateCcw className={cn("h-4 w-4", isBulkReusing && "animate-spin")} />
                {t("bulkReuse", { count: pendingReusableCount })}
              </Button>
            )}
            {/* Generate PDF Report (admin only) */}
            {userRole === "admin" && processInfo && pdfEligibleCount > 0 && (
              pdfExigenciaGroups.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <FileText className="h-4 w-4" />
                      {t("generatePdfReport")}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setPdfReportMode("full")}>
                      {t("pdfReportFull")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPdfReportMode("exigencias")}>
                      {t("pdfReportExigencias")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPdfReportMode("exigencias_atuais")}>
                      {t("pdfReportExigenciasAtuais")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPdfReportMode("pending")}>
                      {t("pdfReportPending")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPdfReportMode("full")}
                  className="gap-1"
                >
                  <FileText className="h-4 w-4" />
                  {t("generatePdfReport")}
                </Button>
              )
            )}
            {/* Checklist sidebar trigger (admin only) */}
            {userRole === "admin" && (
              <ChecklistTriggerButton
                individualProcessId={individualProcessId}
                onClick={() => setChecklistOpen(true)}
              />
            )}
            {/* Upload dropdown (admin only) */}
            {userRole === "admin" && (
              <div className="w-full sm:w-auto">
                <DropdownMenu
                  open={addDocumentMenuOpen}
                  onOpenChange={handleAddDocumentMenuOpenChange}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={statusHistory === undefined}
                      aria-busy={statusHistory === undefined}
                    >
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
                    {hasExigencia && (
                      <DropdownMenuItem onClick={() => setDialogs(prev => ({ ...prev, selectExisting: { open: true } }))}>
                        <Link2 className="h-4 w-4 mr-2" />
                        {t("selectExisting")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            </div>
          </div>
          <TabsList className="grid w-full grid-cols-2 sm:w-fit sm:min-w-80">
            <TabsTrigger value="documents">{t("tabs.documents")}</TabsTrigger>
            <TabsTrigger value="byProgress">{t("tabs.byProgress")}</TabsTrigger>
          </TabsList>
        </CardHeader>

        <TabsContent value="documents" className="mt-0">
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

        {/* Exigência Documents - grouped by status, highest priority */}
        {exigenciaGroups.map(([statusId, group], index) => (
          <div key={statusId}>
            {index > 0 && <Separator className="my-4" />}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex flex-wrap items-center gap-2"
                style={group.caseStatusColor ? { color: group.caseStatusColor } : undefined}
              >
                <AlertTriangle className="h-4 w-4" />
                {t("exigenciaDocuments", {
                  date: group.date ? format(parseISO(group.date), "dd/MM/yyyy HH:mm") : "",
                })}
                <Badge variant="outline" className="sm:ml-auto"
                  style={group.caseStatusColor ? {
                    borderColor: group.caseStatusColor,
                    color: group.caseStatusColor,
                  } : undefined}
                >
                  {group.docs.length}
                </Badge>
              </h3>
              <div className="space-y-2">
                {group.docs.map((doc) => renderDocumentRow(doc, true, !doc.documentTypeId))}
              </div>
            </div>
          </div>
        ))}

        {/* Pending Documents */}
        {unfilledDocuments.length > 0 && (
          <>
            {exigenciaGroups.length > 0 && <Separator />}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex flex-wrap items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {t("unfilledDocuments")}
                <span className="flex items-center gap-1 sm:ml-auto">
                  {userRole === "admin" && processInfo && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={async () => {
                            const count = await bulkExcludeFromReportByDefaultMutation({
                              individualProcessId,
                            })
                            if (count > 0) {
                              toast.success(t("bulkExcludeFromReportSuccess", { count }))
                            } else {
                              toast.info(t("bulkExcludeFromReportNone"))
                            }
                          }}
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">{t("bulkExcludeFromReportTooltip")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Badge variant="outline">
                    {unfilledDocuments.length}
                  </Badge>
                </span>
              </h3>
              <div className="space-y-2">
                {unfilledDocuments.map((doc) => renderDocumentRow(doc, true, !doc.documentTypeId))}
              </div>
            </div>
          </>
        )}

        {/* Received Documents */}
        {filledDocuments.length > 0 && (
          <>
            {(exigenciaGroups.length > 0 || unfilledDocuments.length > 0) && <Separator />}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("filledDocuments")}
                <Badge variant="secondary" className="sm:ml-auto">
                  {filledDocuments.length}
                </Badge>
              </h3>
              <div className="space-y-2">
                {filledDocuments.map((doc) => renderDocumentRow(doc, true, !doc.documentTypeId))}
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
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" size="sm" onClick={openLooseUploadDialog} className="w-full sm:w-auto">
                <FileQuestion className="h-4 w-4 mr-1" />
                {t("uploadLoose")}
              </Button>
              <Button variant="outline" size="sm" onClick={openTypedUploadDialog} className="w-full sm:w-auto">
                <FileType className="h-4 w-4 mr-1" />
                {t("uploadWithType")}
              </Button>
            </div>
          </div>
        )}
          </CardContent>
        </TabsContent>

        <TabsContent value="byProgress" className="mt-0">
          <CardContent className="space-y-6">
            {documentVersionsByProgress === undefined && (
              <div
                className="py-8 text-center text-sm text-muted-foreground"
                aria-live="polite"
              >
                {tCommon("loading")}
              </div>
            )}

            {documentVersionsByProgress?.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" aria-hidden="true" />
                <p className="text-sm font-medium">{t("byProgress.noDocuments")}</p>
                <p className="mt-2 text-xs">{t("byProgress.noDocumentsHint")}</p>
              </div>
            )}

            {documentVersionsByProgress && progressDocumentGroups.map((group, groupIndex) => {
              const snapshot = group.processStatusAtUpload
              const groupName = group.isWithoutProgress
                ? t("byProgress.noProgress")
                : locale === "en" && snapshot?.nameEn
                  ? snapshot.nameEn
                  : snapshot?.name ?? t("byProgress.noProgress")

              return (
                <section
                  key={group.key}
                  className="space-y-3 rounded-lg border p-3 sm:p-4"
                  aria-labelledby={`progress-document-group-${groupIndex}`}
                  style={snapshot?.color ? { borderLeftColor: snapshot.color, borderLeftWidth: 4 } : undefined}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full bg-muted-foreground"
                        style={snapshot?.color ? { backgroundColor: snapshot.color } : undefined}
                        aria-hidden="true"
                      />
                      <h3
                        id={`progress-document-group-${groupIndex}`}
                        className="truncate text-sm font-semibold"
                      >
                        {groupName}
                      </h3>
                    </div>
                    <Badge variant="outline">
                      {t("byProgress.versionCount", { count: group.documents.length })}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {group.documents.map((document) => {
                      const documentName = document.documentType?.name
                        || document.documentName
                        || document.fileName
                      const uploadedAt = format(
                        new Date(document.uploadedAt),
                        locale === "pt" ? "dd/MM/yyyy HH:mm" : "MM/dd/yyyy hh:mm a",
                      )

                      return (
                        <button
                          key={document._id}
                          type="button"
                          className="flex w-full flex-col gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between"
                          onClick={() => openReviewDialog(document._id)}
                          aria-label={t("byProgress.viewVersion", {
                            name: documentName,
                            version: document.version,
                          })}
                        >
                          <div className="flex min-w-0 items-start gap-3 sm:items-center">
                            {getStatusIcon(document.status)}
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="break-words text-sm font-medium">
                                  {documentName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {t("byProgress.version", { version: document.version })}
                                </Badge>
                                {document.isLatest && (
                                  <Badge variant="secondary" className="text-xs">
                                    {t("byProgress.currentVersion")}
                                  </Badge>
                                )}
                              </div>
                              {document.fileName !== documentName && (
                                <p className="truncate text-xs text-muted-foreground" title={document.fileName}>
                                  {document.fileName}
                                </p>
                              )}
                              <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                {t("byProgress.uploadedAt", { date: uploadedAt })}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                            {getStatusBadge(document.status)}
                            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </CardContent>
        </TabsContent>
      </Tabs>

      {latestExigencia && (
        <AlertDialog
          open={latestExigenciaPromptOpen}
          onOpenChange={setLatestExigenciaPromptOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("latestExigenciaPromptTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("latestExigenciaPromptDescription", {
                  status: latestExigencia.caseStatusName,
                  date: latestExigencia.displayDate,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleAddOutsideLatestExigencia}>
                {tCommon("no")}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleOpenLatestExigenciaDocuments}>
                {tCommon("yes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {pendingExigenciaInteraction && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && !isLinkingPendingToExigencia) {
              setPendingExigenciaInteraction(null)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("pendingExigenciaPromptTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("pendingExigenciaPromptDescription", {
                  document:
                    pendingExigenciaInteraction.document.documentType?.name ||
                    pendingExigenciaInteraction.document.documentName ||
                    pendingExigenciaInteraction.document.fileName ||
                    t("looseDocument"),
                  status: pendingExigenciaInteraction.exigencia.caseStatusName,
                  date: pendingExigenciaInteraction.exigencia.displayDate,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={handleContinueOutsideLatestExigencia}
                disabled={isLinkingPendingToExigencia}
              >
                {tCommon("no")}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isLinkingPendingToExigencia}
                onClick={(event) => {
                  event.preventDefault()
                  void handleLinkPendingToLatestExigencia()
                }}
              >
                {isLinkingPendingToExigencia
                  ? tCommon("loading")
                  : tCommon("yes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {latestExigencia && latestExigenciaDocumentsOpen && (
        <StatusDocumentsDialog
          open={latestExigenciaDocumentsOpen}
          onOpenChange={setLatestExigenciaDocumentsOpen}
          individualProcessId={individualProcessId}
          individualProcessStatusId={latestExigencia.statusId}
          caseStatusName={latestExigencia.caseStatusName}
          caseStatusColor={latestExigencia.caseStatusColor}
          caseStatusCode={latestExigencia.caseStatusCode}
          date={latestExigencia.displayDate}
          userRole="admin"
        />
      )}

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
          existingDocumentId={dialogs.upload.document._id}
          existingVersionNotes={dialogs.upload.document.versionNotes}
          documentCreatedAt={dialogs.upload.document.createdAt ?? dialogs.upload.document._creationTime}
          canEditReceivedDate={userRole === "admin"}
          documentInfo={{
            name: dialogs.upload.document.documentType?.name || "",
            description: dialogs.upload.document.documentType?.description,
            maxSizeMB: dialogs.upload.document.documentType?.maxFileSizeMB,
            allowedFormats: dialogs.upload.document.documentType?.allowedFileTypes,
          }}
          validityRule={dialogs.upload.document.validityRule}
          companyReuse={
            dialogs.upload.document.documentType?.isCompanyDocument && companyApplicantId
              ? {
                  companyApplicantId,
                  targetDocumentId: dialogs.upload.document._id,
                  documentTypeName: dialogs.upload.document.documentType?.name || "",
                }
              : undefined
          }
          onReuseClick={() => {
            const doc = dialogs.upload.document
            if (doc) {
              closeAllDialogs()
              openReuseDialog(doc)
            }
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
          userRole={userRole}
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
          canEditReceivedDate={userRole === "admin"}
          onSuccess={closeAllDialogs}
        />
      )}

      <LooseDocumentUploadDialog
        open={dialogs.looseUpload.open}
        onOpenChange={(open) => {
          if (!open) closeAllDialogs()
        }}
        individualProcessId={individualProcessId}
        canEditReceivedDate={userRole === "admin"}
        onSuccess={closeAllDialogs}
      />

      <TypedDocumentUploadDialog
        open={dialogs.typedUpload.open}
        onOpenChange={(open) => {
          if (!open) closeAllDialogs()
        }}
        individualProcessId={individualProcessId}
        canEditReceivedDate={userRole === "admin"}
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

      {dialogs.reuse.open && dialogs.reuse.document && companyApplicantId && (
        <CompanyDocumentReuseDialog
          open={dialogs.reuse.open}
          onOpenChange={(open) => {
            if (!open) closeAllDialogs()
          }}
          companyApplicantId={companyApplicantId}
          documentTypeId={dialogs.reuse.document.documentTypeId}
          targetDocumentId={dialogs.reuse.document.targetDocumentId}
          individualProcessId={individualProcessId}
          documentTypeName={dialogs.reuse.document.documentTypeName}
          onSuccess={closeAllDialogs}
        />
      )}

      {dialogs.informationFields.open && dialogs.informationFields.document && (
        <InformationFieldsDialog
          open={dialogs.informationFields.open}
          onOpenChange={(open) => {
            if (!open) closeAllDialogs()
          }}
          individualProcessId={individualProcessId}
          documentTypeId={dialogs.informationFields.document.documentTypeId}
          documentRequirementId={dialogs.informationFields.document.documentRequirementId}
          documentTypeLegalFrameworkId={dialogs.informationFields.document.documentTypeLegalFrameworkId}
          documentTypeName={dialogs.informationFields.document.documentTypeName}
          onSuccess={closeAllDialogs}
        />
      )}

      {dialogs.pendingUpload.open && dialogs.pendingUpload.documentId && (
        <PendingDocumentUploadDialog
          open={dialogs.pendingUpload.open}
          onOpenChange={(open) => {
            if (!open) closeAllDialogs()
          }}
          documentId={dialogs.pendingUpload.documentId}
          documentName={dialogs.pendingUpload.documentName}
          existingVersionNotes={dialogs.pendingUpload.existingVersionNotes}
          documentCreatedAt={dialogs.pendingUpload.documentCreatedAt}
          canEditReceivedDate={userRole === "admin"}
          onSuccess={closeAllDialogs}
        />
      )}

      {dialogs.selectExisting.open && (
        <SelectExistingDocumentDialog
          open={dialogs.selectExisting.open}
          onOpenChange={(open) => {
            if (!open) closeAllDialogs()
          }}
          individualProcessId={individualProcessId}
          onSuccess={closeAllDialogs}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm({ open: false, documentId: null, documentName: "" })
        }}
        onConfirm={handleDeleteDocument}
        title={t("deleteDocument")}
        description={t("deleteDocumentDescription")}
        isDeleting={isDeleting}
      />

      {/* Requirements Checklist Sidebar */}
      <RequirementsChecklistSheet
        open={checklistOpen}
        onOpenChange={setChecklistOpen}
        individualProcessId={individualProcessId}
        userRole={userRole}
      />

      {/* PDF Report Dialog */}
      {processInfo && (
        <PendingDocumentsPdfDialog
          open={!!pdfReportMode}
          onOpenChange={(open) => { if (!open) setPdfReportMode(null) }}
          reportMode={pdfReportMode === "exigencias_atuais" ? "exigencias" : (pdfReportMode ?? "full")}
          processInfo={processInfo}
          pendingDocuments={pdfPendingDocuments}
          exigenciaGroups={pdfReportMode === "exigencias_atuais" ? pdfExigenciaGroups.slice(0, 1) : pdfExigenciaGroups}
          documentsWithUnfulfilledConditions={pdfDocumentsWithUnfulfilledConditions}
        />
      )}
    </Card>
  )
}
