"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { PendingDocumentUploadDialog } from "./pending-document-upload-dialog";
import { DocumentWaitTimeBadge } from "./document-wait-time-badge";

interface ClientDocumentChecklistProps {
  individualProcessId: Id<"individualProcesses">;
  embedded?: boolean;
}

type UploadDialogState = {
  open: boolean;
  documentId: Id<"documentsDelivered"> | null;
  documentName: string;
  existingVersionNotes?: string;
};

type ClientChecklistDocument = FunctionReturnType<
  typeof api.documentsDelivered.listGroupedByCategory
>["required"][number];

export function ClientDocumentChecklist({
  individualProcessId,
  embedded = false,
}: ClientDocumentChecklistProps) {
  const t = useTranslations("ClientPortal");
  const tCommon = useTranslations("Common");

  const [showOtherDocuments, setShowOtherDocuments] = useState(false);

  const groupedDocuments = useQuery(
    api.documentsDelivered.listGroupedByCategory,
    {
      individualProcessId,
      includeOtherDocuments: showOtherDocuments,
    },
  );

  const previousExigenciaStatusId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!groupedDocuments) return;

    const currentStatusId =
      groupedDocuments.visibility.currentExigenciaStatusId;
    if (previousExigenciaStatusId.current !== currentStatusId) {
      previousExigenciaStatusId.current = currentStatusId;
      setShowOtherDocuments(false);
    }
  }, [groupedDocuments]);

  const [uploadDialog, setUploadDialog] = useState<UploadDialogState>({
    open: false,
    documentId: null,
    documentName: "",
  });

  const closeDialog = () =>
    setUploadDialog({ open: false, documentId: null, documentName: "" });

  const openUploadDialog = (doc: ClientChecklistDocument) => {
    setUploadDialog({
      open: true,
      documentId: doc._id,
      documentName:
        doc.documentType?.name ||
        doc.documentName ||
        doc.fileName ||
        t("genericDocument"),
      existingVersionNotes: doc.versionNotes,
    });
  };

  const allDocuments = useMemo(() => {
    if (!groupedDocuments) return [];
    return [
      ...groupedDocuments.required,
      ...groupedDocuments.optional,
      ...groupedDocuments.loose,
    ];
  }, [groupedDocuments]);

  const exigenciaGroups = useMemo(() => {
    const exigenciaDocs = allDocuments.filter(
      (doc) => doc.linkedStatus?.caseStatusCode === "exigencia",
    );
    const groups = new Map<
      string,
      {
        date: string;
        caseStatusName: string;
        caseStatusColor?: string;
        clientDeadlineDate?: string;
        docs: typeof exigenciaDocs;
      }
    >();
    for (const doc of exigenciaDocs) {
      const statusId = doc.linkedStatus!.individualProcessStatusId;
      if (!groups.has(statusId)) {
        groups.set(statusId, {
          date: doc.linkedStatus!.date || "",
          caseStatusName: doc.linkedStatus!.caseStatusName,
          caseStatusColor: doc.linkedStatus!.caseStatusColor,
          clientDeadlineDate: doc.linkedStatus!.clientDeadlineDate,
          docs: [],
        });
      }
      groups.get(statusId)!.docs.push(doc);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      b[1].date.localeCompare(a[1].date),
    );
  }, [allDocuments]);

  const nonExigenciaDocs = useMemo(
    () =>
      allDocuments.filter(
        (doc) => doc.linkedStatus?.caseStatusCode !== "exigencia",
      ),
    [allDocuments],
  );

  const pendingDocs = useMemo(
    () => nonExigenciaDocs.filter((doc) => doc.status === "not_started"),
    [nonExigenciaDocs],
  );

  const deliveredDocs = useMemo(
    () => nonExigenciaDocs.filter((doc) => doc.status !== "not_started"),
    [nonExigenciaDocs],
  );

  if (groupedDocuments === undefined) {
    if (embedded) {
      return (
        <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
          {tCommon("loading")}
        </div>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("checklistTitle")}</CardTitle>
          <CardDescription>{tCommon("loading")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalDocs = allDocuments.length;
  const visibility = groupedDocuments.visibility;

  const description = visibility.isCurrentExigencia
    ? visibility.canToggleOtherDocuments
      ? t("exigenciaFocusDescription")
      : t("exigenciaOnlyDescription")
    : visibility.accessScope === "none"
      ? t("documentsOnlyDuringExigencia")
      : totalDocs === 0
        ? t("noDocuments")
        : pendingDocs.length +
              exigenciaGroups.reduce((s, [, g]) => s + g.docs.length, 0) ===
            0
          ? t("allUpToDate")
          : t("pendingDocsSummary", {
              count:
                pendingDocs.length +
                exigenciaGroups.reduce((s, [, g]) => s + g.docs.length, 0),
            });

  // Render a pending document card (with CTA to upload)
  const renderPendingCard = (doc: ClientChecklistDocument) => {
    const docName =
      doc.documentType?.name ||
      doc.documentName ||
      doc.fileName ||
      t("genericDocument");
    const description = doc.documentType?.description;

    return (
      <button
        key={doc._id}
        type="button"
        onClick={() => openUploadDialog(doc)}
        className={cn(
          "group flex w-full flex-col gap-3 rounded-lg border-2 border-orange-300 bg-orange-50/50 p-4 text-left transition-all hover:border-orange-400 hover:bg-orange-50 hover:shadow-md sm:flex-row sm:items-center sm:justify-between",
          "dark:border-orange-900 dark:bg-orange-950/30 dark:hover:border-orange-800 dark:hover:bg-orange-950/50",
        )}
      >
        <div className="flex flex-1 items-start gap-3">
          <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900">
            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold leading-snug [overflow-wrap:anywhere]">
                {docName}
              </p>
              <DocumentWaitTimeBadge document={doc} />
              {doc.isRequired && (
                <Badge variant="default" className="text-xs">
                  {t("requiredBadge")}
                </Badge>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {description}
              </p>
            )}
            {doc.versionNotes && (
              <p className="mt-1 text-xs italic text-muted-foreground [overflow-wrap:anywhere]">
                {doc.versionNotes}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-3">
          <span className="inline-flex items-center gap-1 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white sm:bg-transparent sm:px-0 sm:py-0 sm:text-orange-700 dark:sm:text-orange-300">
            <Upload className="h-4 w-4 sm:hidden" />
            {t("sendFile")}
          </span>
          <ChevronRight className="hidden h-5 w-5 text-orange-600 transition-transform group-hover:translate-x-1 sm:block dark:text-orange-300" />
        </div>
      </button>
    );
  };

  // Render a delivered document card (read-only)
  const renderDeliveredCard = (doc: ClientChecklistDocument) => {
    const docName =
      doc.documentType?.name ||
      doc.documentName ||
      doc.fileName ||
      t("genericDocument");

    let statusBadge: ReactElement;
    let containerClass = "border bg-card";
    let icon: ReactElement = (
      <FileText className="h-5 w-5 text-muted-foreground" />
    );

    switch (doc.status) {
      case "approved":
        statusBadge = (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("statusApproved")}
          </Badge>
        );
        icon = <CheckCircle2 className="h-5 w-5 text-green-500" />;
        break;
      case "rejected":
        statusBadge = (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t("statusRejected")}
          </Badge>
        );
        icon = <XCircle className="h-5 w-5 text-destructive" />;
        containerClass =
          "border-2 border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30";
        break;
      case "uploaded":
      case "under_review":
        statusBadge = (
          <Badge variant="info" className="gap-1">
            <Clock className="h-3 w-3" />
            {t("statusAwaitingReview")}
          </Badge>
        );
        icon = <Clock className="h-5 w-5 text-blue-500" />;
        break;
      default:
        statusBadge = <Badge variant="outline">{doc.status}</Badge>;
    }

    const isRejected = doc.status === "rejected";

    return (
      <div
        key={doc._id}
        className={cn(
          "flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between",
          containerClass,
        )}
      >
        <div className="flex flex-1 items-start gap-3">
          {icon}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium leading-snug [overflow-wrap:anywhere]">
                {docName}
              </p>
              <DocumentWaitTimeBadge document={doc} />
            </div>
            {doc.fileName &&
              doc.fileName !== "information_only" &&
              doc.fileName !== docName && (
                <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {doc.fileName}
                </p>
              )}
            {isRejected && doc.rejectionReason && (
              <div className="mt-2 rounded border border-red-300 bg-red-100 p-2 dark:border-red-800 dark:bg-red-950">
                <p className="text-xs font-medium text-red-900 dark:text-red-200">
                  {t("rejectionReasonLabel")}
                </p>
                <p className="text-xs text-red-800 dark:text-red-300 [overflow-wrap:anywhere]">
                  {doc.rejectionReason}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-3">
          {statusBadge}
          {isRejected && (
            <Button
              size="sm"
              variant="default"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() =>
                openUploadDialog({ ...doc, status: "not_started" })
              }
            >
              <Upload className="h-4 w-4 mr-1" />
              {t("reupload")}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card
      className={cn(
        embedded &&
          "gap-0 rounded-none border-0 bg-transparent py-0 shadow-none",
      )}
    >
      {!embedded && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("checklistTitle")}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      )}

      <CardContent className={cn("space-y-6", embedded && "p-0")}>
        {embedded && (
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5" />
              {t("checklistTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}
        {visibility.canToggleOtherDocuments && (
          <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-3">
            <div className="space-y-1">
              <label
                htmlFor="show-other-process-documents"
                className="cursor-pointer text-sm font-medium"
              >
                {showOtherDocuments
                  ? t("hideOtherDocuments")
                  : t("showOtherDocuments", {
                      count: visibility.otherDocumentCount,
                    })}
              </label>
              <p className="text-xs text-muted-foreground">
                {t("otherDocumentsHint")}
              </p>
            </div>
            <Switch
              id="show-other-process-documents"
              checked={showOtherDocuments}
              onCheckedChange={setShowOtherDocuments}
              aria-label={
                showOtherDocuments
                  ? t("hideOtherDocuments")
                  : t("showOtherDocuments", {
                      count: visibility.otherDocumentCount,
                    })
              }
            />
          </div>
        )}

        {/* Exigências (top priority, red) */}
        {exigenciaGroups.map(([statusId, group], index) => (
          <div key={statusId}>
            {index > 0 && <Separator className="my-4" />}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex flex-wrap items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {t("exigenciaTitle", {
                  date: group.date
                    ? format(parseISO(group.date), "dd/MM/yyyy")
                    : "",
                })}
                <Badge
                  variant="outline"
                  className="sm:ml-auto border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                >
                  {group.docs.length}
                </Badge>
              </h3>
              {group.clientDeadlineDate && (
                <p className="text-xs text-red-700 dark:text-red-400">
                  {t("deadlineUntil", {
                    date: format(
                      parseISO(group.clientDeadlineDate),
                      "dd/MM/yyyy",
                    ),
                  })}
                </p>
              )}
              <div className="space-y-2">
                {group.docs.map((doc) =>
                  doc.status === "not_started"
                    ? renderPendingCard(doc)
                    : renderDeliveredCard(doc),
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Pending documents (orange CTA) */}
        {pendingDocs.length > 0 && (
          <>
            {exigenciaGroups.length > 0 && <Separator />}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex flex-wrap items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4" />
                {t("pendingTitle")}
                <Badge
                  variant="outline"
                  className="sm:ml-auto border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300"
                >
                  {pendingDocs.length}
                </Badge>
              </h3>
              <div className="space-y-2">
                {pendingDocs.map(renderPendingCard)}
              </div>
            </div>
          </>
        )}

        {/* Delivered documents (read-only) */}
        {deliveredDocs.length > 0 && (
          <>
            {(exigenciaGroups.length > 0 || pendingDocs.length > 0) && (
              <Separator />
            )}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("deliveredTitle")}
                <Badge variant="secondary" className="sm:ml-auto">
                  {deliveredDocs.length}
                </Badge>
              </h3>
              <div className="space-y-2">
                {deliveredDocs.map(renderDeliveredCard)}
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {totalDocs === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {visibility.accessScope === "none"
                ? t("documentsOnlyDuringExigencia")
                : visibility.isCurrentExigencia
                  ? t("noExigenciaDocuments")
                  : t("noDocuments")}
            </p>
          </div>
        )}
      </CardContent>

      {uploadDialog.open && uploadDialog.documentId && (
        <PendingDocumentUploadDialog
          open={uploadDialog.open}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          documentId={uploadDialog.documentId}
          documentName={uploadDialog.documentName}
          existingVersionNotes={uploadDialog.existingVersionNotes}
          hideAutoApprove
          canEditReceivedDate={false}
          onSuccess={closeDialog}
        />
      )}
    </Card>
  );
}
