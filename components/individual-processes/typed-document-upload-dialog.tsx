"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, File, X, CheckCircle, FileType, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatFileSize,
  validateFileType,
  validateFileSize,
} from "@/lib/validations/documents-delivered";

interface TypedDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualProcessId: Id<"individualProcesses">;
  onSuccess?: () => void;
}

export function TypedDocumentUploadDialog({
  open,
  onOpenChange,
  individualProcessId,
  onSuccess,
}: TypedDocumentUploadDialogProps) {
  const t = useTranslations("DocumentUpload");
  const tCommon = useTranslations("Common");

  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [versionNotes, setVersionNotes] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all active document types
  const documentTypes = useQuery(api.documentTypes.list, { isActive: true });

  const generateUploadUrl = useMutation(api.documentsDelivered.generateUploadUrl);
  const uploadWithType = useMutation(api.documentsDelivered.uploadWithType);

  // Get the selected document type details
  const selectedDocumentType = documentTypes?.find(
    (dt) => dt._id === selectedDocumentTypeId
  );

  const allowedFormats = selectedDocumentType?.allowedFileTypes || [];
  const maxSizeMB = selectedDocumentType?.maxFileSizeMB || 10;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Reset file when document type changes
  useEffect(() => {
    if (selectedDocumentTypeId && selectedFile) {
      // Re-validate the file against new document type constraints
      const fileTypeValidation = validateFileType(selectedFile.name, allowedFormats);
      const fileSizeValidation = validateFileSize(selectedFile.size, maxSizeMB);

      if (!fileTypeValidation.valid || !fileSizeValidation.valid) {
        handleRemoveFile();
        if (!fileTypeValidation.valid) {
          toast.error(fileTypeValidation.message);
        }
        if (!fileSizeValidation.valid) {
          toast.error(fileSizeValidation.message);
        }
      }
    }
  }, [selectedDocumentTypeId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSizeBytes) {
      toast.error(t("errorFileSize", { maxSize: maxSizeMB }));
      return;
    }

    // Validate file format if document type has restrictions
    if (allowedFormats.length > 0) {
      const validation = validateFileType(file.name, allowedFormats);
      if (!validation.valid) {
        toast.error(t("errorFileFormat", { formats: allowedFormats.join(", ") }));
        return;
      }
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t("errorNoFile"));
      return;
    }

    if (!selectedDocumentTypeId) {
      toast.error(t("errorNoDocumentType"));
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Step 1: Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      setUploadProgress(20);

      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await result.json();
      setUploadProgress(60);

      // Step 3: Create typed document record in database
      await uploadWithType({
        individualProcessId,
        documentTypeId: selectedDocumentTypeId as Id<"documentTypes">,
        storageId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        expiryDate: expiryDate || undefined,
        issueDate: issueDate || undefined,
        versionNotes: versionNotes || undefined,
      });

      setUploadProgress(100);

      toast.success(t("successUpload"));
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      handleRemoveFile();
      setSelectedDocumentTypeId("");
      setExpiryDate("");
      setIssueDate("");
      setVersionNotes("");
      setUploadProgress(0);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(t("errorUpload"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      handleRemoveFile();
      setSelectedDocumentTypeId("");
      setExpiryDate("");
      setIssueDate("");
      setVersionNotes("");
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileType className="h-5 w-5" />
            <DialogTitle>{t("typedUploadTitle")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("typedUploadDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document type selector */}
          <div className="space-y-2">
            <Label>{t("documentType")}</Label>
            {!documentTypes ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Combobox
                options={documentTypes.map((dt): ComboboxOption => ({
                  value: dt._id,
                  label: dt.name,
                }))}
                value={selectedDocumentTypeId || undefined}
                onValueChange={(value) => setSelectedDocumentTypeId(value || "")}
                placeholder={t("selectDocumentType")}
                searchPlaceholder={t("searchDocumentType")}
                emptyText={t("noDocumentTypesFound")}
                disabled={isUploading}
                showClearButton={false}
              />
            )}
          </div>

          {/* File requirements based on selected document type */}
          {selectedDocumentType && (
            <div className="text-sm text-muted-foreground space-y-2 p-3 bg-muted/50 rounded-lg">
              {selectedDocumentType.description && (
                <p className="text-foreground">{selectedDocumentType.description}</p>
              )}
              {allowedFormats.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{t("allowedFormats")}:</span>
                  {allowedFormats.map((format) => (
                    <Badge key={format} variant="secondary" className="text-xs">
                      {format}
                    </Badge>
                  ))}
                </div>
              )}
              <p>{t("maxSize")}: {maxSizeMB} MB</p>
            </div>
          )}

          {/* File input */}
          <div className="space-y-2">
            <Label htmlFor="file">{t("selectFile")}</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={allowedFormats.length > 0 ? allowedFormats.join(",") : undefined}
              disabled={isUploading || !selectedDocumentTypeId}
              className="cursor-pointer"
            />
            {!selectedDocumentTypeId && (
              <p className="text-xs text-muted-foreground">
                {t("selectDocumentTypeFirst")}
              </p>
            )}
          </div>

          {/* Selected file preview */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {isUploading && uploadProgress === 100 && (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
            </div>
          )}

          {/* Version notes (optional) */}
          <div className="space-y-2">
            <Label htmlFor="versionNotes">{t("versionNotes")} ({tCommon("optional")})</Label>
            <Textarea
              id="versionNotes"
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder={t("versionNotesPlaceholder")}
              maxLength={500}
              rows={2}
              disabled={isUploading}
            />
          </div>

          {/* Issue date (optional) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="issueDate">{t("issueDate")} ({tCommon("optional")})</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs">
                  {t("issueDateTooltip")}
                </TooltipContent>
              </Tooltip>
            </div>
            <DatePicker
              value={issueDate}
              onChange={(value) => setIssueDate(value || "")}
              disabled={isUploading}
            />
          </div>

          {/* Expiry date (optional) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="expiryDate">{t("expiryDate")} ({tCommon("optional")})</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs">
                  {t("expiryDateTooltip")}
                </TooltipContent>
              </Tooltip>
            </div>
            <DatePicker
              value={expiryDate}
              onChange={(value) => setExpiryDate(value || "")}
              disabled={isUploading}
            />
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("uploading")}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || !selectedDocumentTypeId || isUploading}
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
