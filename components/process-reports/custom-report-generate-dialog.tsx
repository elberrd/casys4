"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useConvex } from "convex/react";
import { Download, FilePenLine, FileText, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { ReportRichTextEditor } from "@/components/report-templates/report-rich-text-editor";
import { ReportPaperPreview } from "@/components/report-templates/report-paper-preview";
import { isCriminalBackgroundReportName } from "@/lib/report-templates/built-in-templates";
import { reportTemplateMatchesProcessLegalFramework } from "@/lib/report-templates/legal-framework-match";
import { buildReportVariableValues } from "@/lib/report-templates/format-values";
import { todayIsoInSaoPaulo } from "@/lib/process-reports/pt-dates";
import { missingUsedReportVariables } from "@/lib/report-templates/substitute";
import type { ReportVariableKey } from "@/lib/report-templates/variables";
import {
  htmlToPdfBlob,
  sanitizeReportFilename,
  triggerBlobDownload,
} from "@/lib/report-templates/html-to-pdf";
import { htmlToDocxBlob } from "@/lib/report-templates/html-to-docx";
import { translateCountryName } from "@/lib/utils/country-translations";
import { hasPassportFile } from "@/lib/passport";
import { buildReportAttachOptions } from "@/lib/report-templates/attach-targets";
import {
  resolveProcessReportEditorContent,
  shouldPersistProcessReportEdit,
} from "@/lib/report-templates/process-report-edit";

export interface ReportAttachTarget {
  documentTypeId: Id<"documentTypes">;
  documentRequirementId?: Id<"documentRequirements">;
  documentName: string;
}

interface CustomReportGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: Id<"individualProcesses">;
  templateId: Id<"reportTemplates"> | null;
  attachTarget?: ReportAttachTarget | null;
  onAttached?: () => void;
}

export function CustomReportGenerateDialog({
  open,
  onOpenChange,
  processId,
  templateId,
  attachTarget = null,
  onAttached,
}: CustomReportGenerateDialogProps) {
  const t = useTranslations("ReportTemplates");
  const tProcess = useTranslations("IndividualProcesses");
  const tPeople = useTranslations("People");
  const tPassports = useTranslations("Passports");
  const tCommon = useTranslations("Common");
  const tReports = useTranslations("ProcessReports");
  const locale = useLocale();
  const router = useRouter();
  const convex = useConvex();

  const [editedHtml, setEditedHtml] = useState("");
  const [filename, setFilename] = useState("");
  const [fromSavedEdit, setFromSavedEdit] = useState(false);
  const [attachEnabled, setAttachEnabled] = useState(Boolean(attachTarget));
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<
    Id<"documentTypes"> | undefined
  >(attachTarget?.documentTypeId);
  const [isSaving, setIsSaving] = useState<"pdf" | "docx" | "attach" | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("edit");
  const [todayIso, setTodayIso] = useState(() => todayIsoInSaoPaulo());
  const [savedEdit, setSavedEdit] = useState<{
    contentHtml: string;
    filename: string;
  } | null | undefined>(undefined);
  const initializedRef = useRef(false);
  const editedHtmlRef = useRef(editedHtml);
  const filenameRef = useRef(filename);
  const lastPersistedRef = useRef({ html: "", filename: "" });
  editedHtmlRef.current = editedHtml;
  filenameRef.current = filename;

  const template = useQuery(
    api.reportTemplates.get,
    open && templateId ? { id: templateId } : "skip",
  );
  const process = useQuery(
    api.individualProcesses.get,
    open ? { id: processId } : "skip",
  );
  const templateAllowed =
    template === undefined || process === undefined
      ? undefined
      : template !== null &&
        process !== null &&
        reportTemplateMatchesProcessLegalFramework(
          template.legalFrameworkId,
          process.legalFrameworkId,
        );
  const statuses = useQuery(
    api.individualProcessStatuses.getStatusHistory,
    open ? { individualProcessId: processId } : "skip",
  );
  const deliveredDocuments = useQuery(
    api.documentsDelivered.list,
    open ? { individualProcessId: processId } : "skip",
  );
  const declarationSource = useQuery(
    api.processReports.getDeclarationSource,
    open ? { individualProcessId: processId } : "skip",
  );

  const generateUploadUrl = useMutation(api.documentsDelivered.generateUploadUrl);
  const uploadDocument = useMutation(api.documentsDelivered.upload);
  const saveEdit = useMutation(api.processReportEdits.save);
  const clearEdit = useMutation(api.processReportEdits.clear);

  useEffect(() => {
    if (open) setTodayIso(todayIsoInSaoPaulo());
  }, [open]);

  useEffect(() => {
    if (!open || !templateId) {
      setSavedEdit(undefined);
      return;
    }
    let cancelled = false;
    void convex
      .query(api.processReportEdits.getByProcessAndTemplate, {
        individualProcessId: processId,
        reportTemplateId: templateId,
      })
      .then(
        (row) => {
          if (!cancelled) setSavedEdit(row);
        },
        () => {
          if (!cancelled) setSavedEdit(null);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [open, templateId, processId, convex]);

  const values = useMemo(() => {
    if (!process) return null;
    return buildReportVariableValues({
      process,
      statuses: statuses ?? [],
      passportFileUploaded: hasPassportFile(
        process.passport,
        deliveredDocuments,
      ),
      i18n: {
        locale,
        tProcess: (key, vars) => tProcess(key as never, vars as never),
        tPeople: (key, vars) => tPeople(key as never, vars as never),
        tPassports: (key) => tPassports(key as never),
        tCommon: (key) => tCommon(key as never),
        translateCountry: (name) => translateCountryName(name, locale),
      },
      extras: {
        todayIso,
        visaReceiptCityName: declarationSource?.cityName,
        visaReceiptStateCode: declarationSource?.stateCode,
        nationalityCode: declarationSource?.nationalityCode,
        nationalityName: declarationSource?.nationalityName,
        nationalityFullName: declarationSource?.nationalityFullName,
        issuingCountryCode: declarationSource?.issuingCountryCode,
        issuingCountryName: declarationSource?.issuingCountryName,
        issuingCountryFullName: declarationSource?.issuingCountryFullName,
      },
    });
  }, [
    process,
    statuses,
    deliveredDocuments,
    declarationSource,
    todayIso,
    locale,
    tProcess,
    tPeople,
    tPassports,
    tCommon,
  ]);

  const missingFields = useMemo(() => {
    if (!template || !values) return [];
    const missing: ReportVariableKey[] = missingUsedReportVariables(
      template.contentHtml,
      values,
    );
    if (
      isCriminalBackgroundReportName(template.name) &&
      !values.visaReceiptPlace.trim() &&
      !missing.includes("visaReceiptPlace")
    ) {
      missing.push("visaReceiptPlace");
    }
    return missing;
  }, [template, values]);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setActiveTab("edit");
      setFromSavedEdit(false);
      return;
    }
    if (
      !template ||
      !values ||
      declarationSource === undefined ||
      savedEdit === undefined ||
      initializedRef.current
    ) {
      return;
    }
    initializedRef.current = true;
    const resolved = resolveProcessReportEditorContent({
      saved: savedEdit,
      templateHtml: template.contentHtml,
      templateName: template.name,
      values,
      todayIso,
    });
    setEditedHtml(resolved.html);
    setFilename(resolved.filename);
    setFromSavedEdit(resolved.fromSavedEdit);
    lastPersistedRef.current = {
      html: resolved.html,
      filename: resolved.filename,
    };
    setAttachEnabled(Boolean(attachTarget));
    setSelectedDocumentTypeId(attachTarget?.documentTypeId);
  }, [open, template, values, attachTarget, todayIso, declarationSource, savedEdit]);

  const persistIfDirty = () => {
    if (!templateId || !initializedRef.current) return;
    const html = editedHtmlRef.current;
    const name = filenameRef.current;
    if (
      !shouldPersistProcessReportEdit({
        html,
        filename: name,
        lastPersistedHtml: lastPersistedRef.current.html,
        lastPersistedFilename: lastPersistedRef.current.filename,
      })
    ) {
      return;
    }
    lastPersistedRef.current = { html, filename: name };
    void saveEdit({
      individualProcessId: processId,
      reportTemplateId: templateId,
      contentHtml: html,
      filename: name,
    }).catch((error) => {
      console.error(error);
    });
  };

  useEffect(() => {
    if (!open || !initializedRef.current || !templateId) return;
    if (
      !shouldPersistProcessReportEdit({
        html: editedHtml,
        filename,
        lastPersistedHtml: lastPersistedRef.current.html,
        lastPersistedFilename: lastPersistedRef.current.filename,
      })
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      persistIfDirty();
    }, 1500);
    return () => window.clearTimeout(timer);
    // persistIfDirty reads refs; html/filename/open are the triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedHtml, filename, open, templateId]);

  const attachOptions = useMemo(() => {
    if (!template) return [];
    return buildReportAttachOptions({
      documentTypes: template.documentTypes,
      processDocuments: deliveredDocuments ?? [],
    }).map((option) => ({
      value: option.documentTypeId,
      label: option.label,
      documentRequirementId: option.documentRequirementId,
    }));
  }, [template, deliveredDocuments]);

  const canAttach = Boolean(attachTarget) || attachOptions.length > 0;

  const resetLocalState = () => {
    setEditedHtml("");
    setFilename("");
    setIsSaving(null);
    setAttachEnabled(false);
    setSelectedDocumentTypeId(undefined);
    setFromSavedEdit(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      persistIfDirty();
      initializedRef.current = false;
      resetLocalState();
    }
    onOpenChange(nextOpen);
  };

  const handleUseOriginalTemplate = () => {
    if (!template || !values || !templateId) return;
    const resolved = resolveProcessReportEditorContent({
      saved: null,
      templateHtml: template.contentHtml,
      templateName: template.name,
      values,
      todayIso,
    });
    setEditedHtml(resolved.html);
    setFilename(resolved.filename);
    setFromSavedEdit(false);
    lastPersistedRef.current = {
      html: resolved.html,
      filename: resolved.filename,
    };
    void clearEdit({
      individualProcessId: processId,
      reportTemplateId: templateId,
    }).catch((error) => {
      console.error(error);
    });
  };

  const handleEditOriginal = () => {
    if (!templateId) return;
    persistIfDirty();
    router.push(`/report-templates/${templateId}/edit`);
  };

  const fileBaseName = () =>
    sanitizeReportFilename(filename || template?.name || t("title"));

  const buildPdf = async () => {
    const blob = await htmlToPdfBlob(editedHtml);
    const name = fileBaseName();
    return {
      blob,
      filename: name.endsWith(".pdf") ? name : `${name}.pdf`,
    };
  };

  const handleDownloadPdf = async () => {
    setIsSaving("pdf");
    try {
      persistIfDirty();
      const { blob, filename: pdfName } = await buildPdf();
      triggerBlobDownload(blob, pdfName);
    } catch (error) {
      console.error(error);
      toast.error(t("errorDownload"));
    } finally {
      setIsSaving(null);
    }
  };

  const handleDownloadDocx = async () => {
    setIsSaving("docx");
    try {
      persistIfDirty();
      const blob = await htmlToDocxBlob(editedHtml);
      const name = fileBaseName();
      triggerBlobDownload(
        blob,
        name.endsWith(".docx") ? name : `${name}.docx`,
      );
    } catch (error) {
      console.error(error);
      toast.error(t("errorDownloadDocx"));
    } finally {
      setIsSaving(null);
    }
  };

  const handleAttach = async () => {
    const documentTypeId =
      attachTarget?.documentTypeId ?? selectedDocumentTypeId;
    if (!documentTypeId) {
      toast.error(t("selectDocumentToAttach"));
      return;
    }

    const matchingOption = attachOptions.find(
      (option) => option.value === documentTypeId,
    );
    const documentRequirementId =
      attachTarget?.documentRequirementId ?? matchingOption?.documentRequirementId;

    setIsSaving("attach");
    try {
      persistIfDirty();
      const { blob, filename: pdfName } = await buildPdf();
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: blob,
      });
      if (!result.ok) {
        throw new Error("Failed to upload PDF");
      }
      const { storageId } = (await result.json()) as {
        storageId: Id<"_storage">;
      };

      await uploadDocument({
        individualProcessId: processId,
        documentTypeId,
        documentRequirementId,
        storageId,
        fileName: pdfName,
        fileSize: blob.size,
        mimeType: "application/pdf",
        autoApprove: true,
        bypassConditions: true,
        versionNotes: t("generatedFromTemplate", {
          name: template?.name ?? "",
        }),
      });

      toast.success(t("attachedSuccess"));
      handleOpenChange(false);
      onAttached?.();
    } catch (error) {
      console.error(error);
      toast.error(t("errorAttach"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSaving(null);
    }
  };

  const isLoading =
    open &&
    (template === undefined ||
      process === undefined ||
      statuses === undefined ||
      deliveredDocuments === undefined ||
      declarationSource === undefined ||
      savedEdit === undefined);
  const loadFailed =
    open &&
    (template === null || process === null || templateAllowed === false);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        variant="fullscreen"
        className="inset-2 flex max-h-none flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="mb-0 space-y-0 px-4 pt-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <DialogTitle className="text-base">
              {template?.name ?? t("generateTitle")}
            </DialogTitle>
            {templateId && !isLoading && !loadFailed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleEditOriginal}
              >
                <FilePenLine className="h-4 w-4" />
                {t("editOriginalReport")}
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("generating")}
          </div>
        ) : loadFailed ? (
          <div className="px-4 py-12 text-center text-sm text-destructive">
            {t("errorLoad")}
          </div>
        ) : (
          <>
            <div className="px-4 pb-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label
                    htmlFor="custom-report-filename"
                    className="mb-1 text-xs text-muted-foreground"
                  >
                    {t("filenameLabel")}
                  </Label>
                  <Input
                    id="custom-report-filename"
                    value={filename}
                    onChange={(event) => setFilename(event.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                {canAttach && (
                  <div className="flex flex-col justify-end gap-1.5">
                    {attachTarget ? (
                      <p className="pb-1 text-xs text-muted-foreground">
                        {t("attachPdfTo", { name: attachTarget.documentName })}
                      </p>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={attachEnabled}
                            onCheckedChange={(checked) => {
                              const enabled = checked === true;
                              setAttachEnabled(enabled);
                              if (
                                enabled &&
                                !selectedDocumentTypeId &&
                                attachOptions.length === 1
                              ) {
                                setSelectedDocumentTypeId(attachOptions[0]?.value);
                              }
                            }}
                          />
                          {t("attachPdf")}
                        </label>
                        {attachEnabled && (
                          <Combobox
                            options={attachOptions.map((option) => ({
                              value: option.value,
                              label: option.label,
                            }))}
                            value={selectedDocumentTypeId}
                            onValueChange={(value) =>
                              setSelectedDocumentTypeId(
                                value as Id<"documentTypes"> | undefined,
                              )
                            }
                            placeholder={t("selectDocumentToAttach")}
                            popoverModal
                            isolateListScroll
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              {fromSavedEdit && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{t("continuingPreviousEdit")}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={handleUseOriginalTemplate}
                  >
                    {t("useOriginalTemplate")}
                  </Button>
                </div>
              )}
              {missingFields.length > 0 && (
                <Alert className="mt-2 py-2">
                  <FileText />
                  <AlertTitle>{tReports("missingFieldsTitle")}</AlertTitle>
                  <AlertDescription>
                    {tReports("missingFieldsDescription")}{" "}
                    {missingFields
                      .map((field) =>
                        field === "visaReceiptPlace"
                          ? tReports("missingFields.visaReceiptPlace")
                          : t(`variables.${field}`),
                      )
                      .join(", ")}
                    .
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex min-h-0 flex-1 flex-col px-4 pb-2"
            >
              <TabsList>
                <TabsTrigger value="edit">{t("editTab")}</TabsTrigger>
                <TabsTrigger value="preview">{t("previewTab")}</TabsTrigger>
              </TabsList>
              <div
                className={cn(
                  "mt-2 min-h-0 flex-1 flex-col overflow-hidden",
                  activeTab === "edit" ? "flex" : "hidden",
                )}
              >
                <ReportRichTextEditor
                  value={editedHtml}
                  onChange={setEditedHtml}
                  className="min-h-0 flex-1"
                />
              </div>
              <div
                className={cn(
                  "mt-2 min-h-0 flex-1 flex-col overflow-hidden",
                  activeTab === "preview" ? "flex" : "hidden",
                )}
              >
                <ReportPaperPreview
                  html={editedHtml}
                  className="h-full min-h-0"
                  ariaLabel={t("previewAriaLabel")}
                  pageBreakLabel={(page) => t("toolbar.pageBreak", { page })}
                />
              </div>
            </Tabs>

            <DialogFooter className="gap-2 border-t px-4 py-3 pt-3 sm:justify-between">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {tCommon("close")}
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => void handleDownloadDocx()}
                  disabled={isSaving !== null}
                >
                  {isSaving === "docx" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {t("downloadDocx")}
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => void handleDownloadPdf()}
                  disabled={isSaving !== null}
                >
                  {isSaving === "pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {t("downloadPdf")}
                </Button>
                {canAttach && (
                  <Button
                    onClick={() => void handleAttach()}
                    disabled={
                      isSaving !== null ||
                      (!attachTarget &&
                        (!attachEnabled || !selectedDocumentTypeId))
                    }
                  >
                    {isSaving === "attach" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="mr-2 h-4 w-4" />
                    )}
                    {t("saveAndAttach")}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
