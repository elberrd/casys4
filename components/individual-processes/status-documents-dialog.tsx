"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  ChevronDown,
  FileQuestion,
  FileType,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Eye,
  Trash2,
  Building2,
  RotateCcw,
  Link2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LooseDocumentUploadDialog } from "./loose-document-upload-dialog";
import { TypedDocumentUploadDialog } from "./typed-document-upload-dialog";
import { DocumentReviewDialog } from "./document-review-dialog";
import { DocumentUploadDialog } from "./document-upload-dialog";
import { CompanyDocumentReuseDialog } from "./company-document-reuse-dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { PendingDocumentUploadDialog } from "./pending-document-upload-dialog";
import { SelectExistingDocumentDialog } from "./select-existing-document-dialog";

type ActiveSubDialog =
  | null
  | "looseUpload"
  | "typedUpload"
  | "selectExisting"
  | "review"
  | "upload"
  | "reuse"
  | "delete"
  | "pendingUpload";

interface StatusDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualProcessId: Id<"individualProcesses">;
  individualProcessStatusId: Id<"individualProcessStatuses">;
  caseStatusName: string;
  caseStatusColor?: string;
  caseStatusCode?: string;
  date?: string;
  userRole?: "admin" | "client";
}

export function StatusDocumentsDialog({
  open,
  onOpenChange,
  individualProcessId,
  individualProcessStatusId,
  caseStatusName,
  caseStatusColor,
  caseStatusCode,
  date,
  userRole = "client",
}: StatusDocumentsDialogProps) {
  const t = useTranslations("IndividualProcesses");
  const tDoc = useTranslations("DocumentChecklist");
  const tCommon = useTranslations("Common");

  const [activeSubDialog, setActiveSubDialog] = useState<ActiveSubDialog>(null);
  const [reviewDocumentId, setReviewDocumentId] = useState<Id<"documentsDelivered"> | null>(null);
  const [uploadDocument, setUploadDocument] = useState<any>(null);
  const [reuseDocument, setReuseDocument] = useState<{
    targetDocumentId: Id<"documentsDelivered">;
    documentTypeId: Id<"documentTypes">;
    documentTypeName: string;
  } | null>(null);
  const [pendingUploadDoc, setPendingUploadDoc] = useState<{
    documentId: Id<"documentsDelivered">;
    documentName: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    documentId: Id<"documentsDelivered"> | null;
    documentName: string;
  }>({ open: false, documentId: null, documentName: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  const result = useQuery(api.documentsDelivered.listByStatus, {
    individualProcessStatusId,
  });

  const documents = result?.documents;
  const companyApplicantId = result?.companyApplicantId;

  // Check which document types have reusable company documents
  const reusableTypeIds = useQuery(
    api.documentsDelivered.getReusableDocumentTypeIds,
    companyApplicantId
      ? { companyApplicantId, excludeProcessId: individualProcessId }
      : "skip"
  );
  const reusableTypeIdSet = useMemo(
    () => new Set(reusableTypeIds ?? []),
    [reusableTypeIds]
  );

  const removeDocument = useMutation(api.documentsDelivered.remove);
  const unlinkFromStatus = useMutation(api.documentsDelivered.unlinkFromStatus);

  // Hide main dialog when a sub-dialog is active
  const mainDialogVisible = open && activeSubDialog === null;

  const openSubDialog = (type: ActiveSubDialog) => {
    setActiveSubDialog(type);
  };

  const closeSubDialog = () => {
    setActiveSubDialog(null);
    setReviewDocumentId(null);
    setUploadDocument(null);
    setReuseDocument(null);
    setPendingUploadDoc(null);
  };

  const handleUnlinkDocument = async () => {
    if (!deleteConfirm.documentId) return;
    setIsDeleting(true);
    try {
      await unlinkFromStatus({ id: deleteConfirm.documentId });
      toast.success(tDoc("unlinkFromStatusSuccess"));
      setDeleteConfirm({ open: false, documentId: null, documentName: "" });
      setActiveSubDialog(null);
    } catch (error) {
      toast.error(tDoc("unlinkFromStatusError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenUpload = (doc: any) => {
    if (doc.documentTypeId) {
      setUploadDocument(doc);
      openSubDialog("upload");
    }
  };

  const handleOpenPendingUpload = (doc: any) => {
    setPendingUploadDoc({
      documentId: doc._id,
      documentName: doc.documentType?.name || doc.documentName || doc.fileName || tDoc("looseDocument"),
    });
    openSubDialog("pendingUpload");
  };

  const handleOpenReview = (docId: Id<"documentsDelivered">) => {
    setReviewDocumentId(docId);
    openSubDialog("review");
  };

  const handleOpenReuse = (doc: any) => {
    if (!doc.documentTypeId) return;
    setReuseDocument({
      targetDocumentId: doc._id,
      documentTypeId: doc.documentTypeId,
      documentTypeName: doc.documentType?.name || "",
    });
    openSubDialog("reuse");
  };

  const handleOpenDelete = (doc: any) => {
    setDeleteConfirm({
      open: true,
      documentId: doc._id,
      documentName: doc.documentType?.name || doc.documentName || doc.fileName || tDoc("looseDocument"),
    });
    openSubDialog("delete");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />{tDoc("status.approved")}</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{tDoc("status.rejected")}</Badge>;
      case "uploaded":
        return <Badge variant="info" className="gap-1"><Clock className="h-3 w-3" />{tDoc("status.uploaded")}</Badge>;
      case "under_review":
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />{tDoc("status.underReview")}</Badge>;
      case "not_started":
        return <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />{tDoc("status.notStarted")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "uploaded":
      case "under_review":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "not_started":
        return <FileText className="h-5 w-5 text-muted-foreground" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Format date for display
  const displayDate = date
    ? date.includes("T")
      ? date.replace("T", " ")
      : date
    : "";

  return (
    <>
      <Dialog open={mainDialogVisible} onOpenChange={(val) => {
        if (!val) onOpenChange(false);
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle>{t("statusDocuments")}</DialogTitle>
              <Badge
                variant="outline"
                style={caseStatusColor ? {
                  borderColor: caseStatusColor,
                  color: caseStatusColor,
                } : undefined}
              >
                {caseStatusName}
                {displayDate && ` - ${displayDate}`}
              </Badge>
            </div>
            <DialogDescription>
              {t("statusDocumentsDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Add document button */}
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    {tDoc("addDocument")}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openSubDialog("looseUpload")}>
                    <FileQuestion className="h-4 w-4 mr-2" />
                    {tDoc("uploadLoose")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openSubDialog("typedUpload")}>
                    <FileType className="h-4 w-4 mr-2" />
                    {tDoc("uploadWithType")}
                  </DropdownMenuItem>
                  {caseStatusCode === "exigencia" && (
                    <DropdownMenuItem onClick={() => openSubDialog("selectExisting")}>
                      <Link2 className="h-4 w-4 mr-2" />
                      {tDoc("selectExisting")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Documents list */}
            {documents === undefined ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t("noStatusDocuments")}</p>
                <p className="text-xs mt-2">{t("noStatusDocumentsHint")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="flex cursor-pointer flex-col gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => {
                      if (doc.status === "not_started") {
                        if (doc.documentTypeId) {
                          handleOpenUpload(doc);
                        } else {
                          handleOpenPendingUpload(doc);
                        }
                      } else {
                        handleOpenReview(doc._id);
                      }
                    }}
                  >
                    <div className="flex w-full flex-1 items-start gap-3 sm:items-center">
                      {getStatusIcon(doc.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex min-w-0 flex-wrap items-start gap-2">
                          <p className="min-w-0 flex-1 text-sm font-medium leading-snug [overflow-wrap:anywhere]">
                            {doc.documentType?.name || doc.documentName || doc.fileName || tDoc("looseDocument")}
                          </p>
                          {doc.documentType?.isCompanyDocument === true && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Building2 className="h-3 w-3" />
                              {tDoc("companyDocument")}
                            </Badge>
                          )}
                          {!doc.documentTypeId && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <FileQuestion className="h-3 w-3" />
                              {tDoc("looseDocument")}
                            </Badge>
                          )}
                        </div>
                        {doc.fileName && doc.status !== "not_started" && (
                          <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                            {doc.fileName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 sm:ml-3 sm:w-auto sm:justify-end" onClick={(e) => e.stopPropagation()}>
                      {getStatusBadge(doc.status)}

                      {/* Illegible badge */}
                      {doc.isIllegible && doc.status === "rejected" && (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          {tDoc("illegible")}
                        </Badge>
                      )}

                      {doc.status === "not_started" ? (
                        <div className="flex flex-wrap gap-1">
                          {/* Reuse button for company documents */}
                          {doc.documentType?.isCompanyDocument === true && companyApplicantId && doc.documentTypeId && reusableTypeIdSet.has(doc.documentTypeId) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenReuse(doc)}
                              title={tDoc("reuseExisting")}
                              className="cursor-pointer"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {doc.documentTypeId ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenUpload(doc)}
                              title={tDoc("upload")}
                              className="cursor-pointer"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenPendingUpload(doc)}
                              title={tDoc("upload")}
                              className="cursor-pointer"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          )}
                          {userRole === "admin" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDelete(doc)}
                              title={tDoc("deleteDocument")}
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
                            onClick={() => handleOpenReview(doc._id)}
                            title={tDoc("viewDetails")}
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {doc.status !== "approved" && userRole === "admin" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDelete(doc)}
                              title={tDoc("deleteDocument")}
                              className="cursor-pointer text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Loose Document Upload - pre-selects this status entry */}
      {activeSubDialog === "looseUpload" && (
        <LooseDocumentUploadDialog
          open
          onOpenChange={(val) => { if (!val) closeSubDialog(); }}
          individualProcessId={individualProcessId}
          defaultStatusId={individualProcessStatusId}
          onSuccess={closeSubDialog}
        />
      )}

      {/* Typed Document Upload - pre-selects this status entry */}
      {activeSubDialog === "typedUpload" && (
        <TypedDocumentUploadDialog
          open
          onOpenChange={(val) => { if (!val) closeSubDialog(); }}
          individualProcessId={individualProcessId}
          defaultStatusId={individualProcessStatusId}
          onSuccess={closeSubDialog}
        />
      )}

      {/* Select Existing Document */}
      {activeSubDialog === "selectExisting" && (
        <SelectExistingDocumentDialog
          open
          onOpenChange={(val) => { if (!val) closeSubDialog(); }}
          individualProcessId={individualProcessId}
          individualProcessStatusId={individualProcessStatusId}
          onSuccess={closeSubDialog}
        />
      )}

      {/* Review Dialog */}
      {activeSubDialog === "review" && reviewDocumentId && (
        <DocumentReviewDialog
          open
          onOpenChange={(val) => { if (!val) closeSubDialog(); }}
          documentId={reviewDocumentId}
          onSuccess={closeSubDialog}
        />
      )}

      {/* Upload Dialog for not_started typed docs */}
      {activeSubDialog === "upload" && uploadDocument && uploadDocument.documentTypeId && (
        <DocumentUploadDialog
          open
          onOpenChange={(val) => { if (!val) closeSubDialog(); }}
          individualProcessId={individualProcessId}
          documentTypeId={uploadDocument.documentTypeId}
          documentRequirementId={uploadDocument.documentRequirementId}
          documentInfo={{
            name: uploadDocument.documentType?.name || "",
            description: uploadDocument.documentType?.description,
            maxSizeMB: uploadDocument.documentType?.maxFileSizeMB,
            allowedFormats: uploadDocument.documentType?.allowedFileTypes,
          }}
          companyReuse={
            uploadDocument.documentType?.isCompanyDocument && companyApplicantId
              ? {
                  companyApplicantId,
                  targetDocumentId: uploadDocument._id,
                  documentTypeName: uploadDocument.documentType?.name || "",
                }
              : undefined
          }
          onReuseClick={() => {
            if (uploadDocument) {
              setReuseDocument({
                targetDocumentId: uploadDocument._id,
                documentTypeId: uploadDocument.documentTypeId,
                documentTypeName: uploadDocument.documentType?.name || "",
              });
              setUploadDocument(null);
              setActiveSubDialog("reuse");
            }
          }}
          onSuccess={closeSubDialog}
        />
      )}

      {/* Company Document Reuse Dialog */}
      {activeSubDialog === "reuse" && reuseDocument && companyApplicantId && (
        <CompanyDocumentReuseDialog
          open
          onOpenChange={(val) => { if (!val) closeSubDialog(); }}
          companyApplicantId={companyApplicantId}
          documentTypeId={reuseDocument.documentTypeId}
          targetDocumentId={reuseDocument.targetDocumentId}
          individualProcessId={individualProcessId}
          documentTypeName={reuseDocument.documentTypeName}
          onSuccess={closeSubDialog}
        />
      )}

      {/* Pending Document Upload */}
      {activeSubDialog === "pendingUpload" && pendingUploadDoc && (
        <PendingDocumentUploadDialog
          open
          onOpenChange={(val) => { if (!val) closeSubDialog(); }}
          documentId={pendingUploadDoc.documentId}
          documentName={pendingUploadDoc.documentName}
          onSuccess={closeSubDialog}
        />
      )}

      {/* Unlink Confirmation */}
      {activeSubDialog === "delete" && (
        <DeleteConfirmationDialog
          open={deleteConfirm.open}
          onOpenChange={(val) => {
            if (!val) {
              setDeleteConfirm({ open: false, documentId: null, documentName: "" });
              closeSubDialog();
            }
          }}
          onConfirm={handleUnlinkDocument}
          title={tDoc("unlinkFromStatus")}
          description={tDoc("unlinkFromStatusDescription")}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
