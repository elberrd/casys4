"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { Download, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
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
import { buildReportVariableValues } from "@/lib/report-templates/format-values";
import { substituteReportVariables } from "@/lib/report-templates/substitute";
import {
  htmlToPdfBlob,
  sanitizeReportFilename,
  triggerBlobDownload,
} from "@/lib/report-templates/html-to-pdf";
import { translateCountryName } from "@/lib/utils/country-translations";
import { hasPassportFile } from "@/lib/passport";

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
}

export function CustomReportGenerateDialog({
  open,
  onOpenChange,
  processId,
  templateId,
  attachTarget = null,
}: CustomReportGenerateDialogProps) {
  const t = useTranslations("ReportTemplates");
  const tProcess = useTranslations("IndividualProcesses");
  const tPeople = useTranslations("People");
  const tPassports = useTranslations("Passports");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  const [editedHtml, setEditedHtml] = useState("");
  const [filename, setFilename] = useState("");
  const [attachEnabled, setAttachEnabled] = useState(Boolean(attachTarget));
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<
    Id<"documentTypes"> | undefined
  >(attachTarget?.documentTypeId);
  const [isSaving, setIsSaving] = useState<"download" | "attach" | null>(null);
  const [mobileTab, setMobileTab] = useState("edit");
  const initializedRef = useRef(false);

  const template = useQuery(
    api.reportTemplates.get,
    open && templateId ? { id: templateId } : "skip",
  );
  const process = useQuery(
    api.individualProcesses.get,
    open ? { id: processId } : "skip",
  );
  const statuses = useQuery(
    api.individualProcessStatuses.getStatusHistory,
    open ? { individualProcessId: processId } : "skip",
  );
  const deliveredDocuments = useQuery(
    api.documentsDelivered.list,
    open ? { individualProcessId: processId } : "skip",
  );

  const generateUploadUrl = useMutation(api.documentsDelivered.generateUploadUrl);
  const uploadDocument = useMutation(api.documentsDelivered.upload);

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
    });
  }, [
    process,
    statuses,
    deliveredDocuments,
    locale,
    tProcess,
    tPeople,
    tPassports,
    tCommon,
  ]);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setMobileTab("edit");
      return;
    }
    if (!template || !values || initializedRef.current) return;
    initializedRef.current = true;
    setEditedHtml(substituteReportVariables(template.contentHtml, values));
    setFilename(template.name);
    setAttachEnabled(Boolean(attachTarget));
    setSelectedDocumentTypeId(attachTarget?.documentTypeId);
  }, [open, template, values, attachTarget]);

  const attachOptions = useMemo(() => {
    if (!template || !deliveredDocuments) return [];
    const linkedIds = new Set(template.documentTypes.map((item) => item._id));
    return deliveredDocuments
      .filter(
        (document) =>
          document.documentTypeId &&
          linkedIds.has(document.documentTypeId) &&
          document.isLatest !== false,
      )
      .map((document) => ({
        value: document.documentTypeId as Id<"documentTypes">,
        label:
          document.documentType?.name ||
          document.documentName ||
          document.fileName,
        documentRequirementId: document.documentRequirementId,
      }));
  }, [template, deliveredDocuments]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEditedHtml("");
      setFilename("");
      setIsSaving(null);
      setAttachEnabled(false);
      setSelectedDocumentTypeId(undefined);
    }
    onOpenChange(nextOpen);
  };

  const buildPdf = async () => {
    const blob = await htmlToPdfBlob(editedHtml);
    const name = sanitizeReportFilename(filename || template?.name || t("title"));
    return {
      blob,
      filename: name.endsWith(".pdf") ? name : `${name}.pdf`,
    };
  };

  const handleDownload = async () => {
    setIsSaving("download");
    try {
      const { blob, filename: pdfName } = await buildPdf();
      triggerBlobDownload(blob, pdfName);
    } catch (error) {
      console.error(error);
      toast.error(t("errorDownload"));
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
      deliveredDocuments === undefined);
  const loadFailed = open && (template === null || process === null);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        variant="fullscreen"
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {template?.name ?? t("generateTitle")}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("generating")}
          </div>
        ) : loadFailed ? (
          <div className="px-6 py-12 text-center text-sm text-destructive">
            {t("errorLoad")}
          </div>
        ) : (
          <>
            <div className="space-y-3 px-6 pb-3">
              <div>
                <Label htmlFor="custom-report-filename" className="mb-1 text-xs text-muted-foreground">
                  {t("filenameLabel")}
                </Label>
                <Input
                  id="custom-report-filename"
                  value={filename}
                  onChange={(event) => setFilename(event.target.value)}
                />
              </div>
              {(attachTarget || attachOptions.length > 0) && (
                <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={attachEnabled}
                      onCheckedChange={(checked) =>
                        setAttachEnabled(checked === true)
                      }
                    />
                    {t("attachPdf")}
                  </label>
                  {attachTarget ? (
                    <p className="text-sm text-muted-foreground">
                      {attachTarget.documentName}
                    </p>
                  ) : (
                    <div className="min-w-0 flex-1">
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
                        disabled={!attachEnabled}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-6 pb-2">
              <Tabs
                value={mobileTab}
                onValueChange={setMobileTab}
                className="mb-3 lg:hidden"
              >
                <TabsList>
                  <TabsTrigger value="edit">{t("editTab")}</TabsTrigger>
                  <TabsTrigger value="preview">{t("previewTab")}</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-2">
                <div
                  className={cn(
                    "min-h-0 flex-col overflow-hidden",
                    mobileTab === "edit" ? "flex" : "hidden lg:flex",
                  )}
                >
                  <p className="mb-2 hidden text-xs font-medium uppercase tracking-wide text-muted-foreground lg:block">
                    {t("editTab")}
                  </p>
                  <ReportRichTextEditor
                    value={editedHtml}
                    onChange={setEditedHtml}
                    className="min-h-0 flex-1"
                  />
                </div>
                <div
                  className={cn(
                    "min-h-0 flex-col overflow-hidden",
                    mobileTab === "preview" ? "flex" : "hidden lg:flex",
                  )}
                >
                  <p className="mb-2 hidden text-xs font-medium uppercase tracking-wide text-muted-foreground lg:block">
                    {t("previewTab")}
                  </p>
                  <ReportPaperPreview
                    html={editedHtml}
                    className="h-full min-h-[48vh]"
                    ariaLabel={t("previewAriaLabel")}
                    pageBreakLabel={(page) => t("toolbar.pageBreak", { page })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-between">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {tCommon("close")}
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isSaving !== null}
                >
                  {isSaving === "download" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {t("downloadPdf")}
                </Button>
                {(attachTarget || attachOptions.length > 0) && (
                  <Button
                    onClick={handleAttach}
                    disabled={isSaving !== null || !attachEnabled}
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
