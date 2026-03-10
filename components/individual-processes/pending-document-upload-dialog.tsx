"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, File, X, CheckCircle } from "lucide-react";
import { formatFileSize } from "@/lib/validations/documents-delivered";

interface PendingDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: Id<"documentsDelivered">;
  documentName: string;
  onSuccess?: () => void;
}

export function PendingDocumentUploadDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  onSuccess,
}: PendingDocumentUploadDialogProps) {
  const t = useTranslations("DocumentUpload");
  const tCommon = useTranslations("Common");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [versionNotes, setVersionNotes] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.documentsDelivered.generateUploadUrl);
  const uploadForPending = useMutation(api.documentsDelivered.uploadForPending);

  const maxSizeMB = 10;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeBytes) {
      toast.error(t("errorFileSize", { maxSize: maxSizeMB }));
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      handleRemoveFile();
      setExpiryDate("");
      setVersionNotes("");
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t("errorNoFile"));
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Step 1: Get upload URL
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

      const json = await result.json();
      setUploadProgress(60);

      // Step 3: Attach file to existing document
      await uploadForPending({
        documentId,
        storageId: json.storageId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        expiryDate: expiryDate || undefined,
        versionNotes: versionNotes || undefined,
      });

      setUploadProgress(100);
      toast.success(t("successUpload"));
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      handleRemoveFile();
      setExpiryDate("");
      setVersionNotes("");
      setUploadProgress(0);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(t("errorUpload"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <DialogTitle>{t("pendingUploadTitle")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("pendingUploadDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document name display */}
          <div className="text-sm font-medium">{documentName}</div>

          {/* File requirements */}
          <div className="text-sm text-muted-foreground">
            <p>{t("maxSize")}: {maxSizeMB} MB</p>
          </div>

          {/* File input */}
          <div className="space-y-2">
            <Label htmlFor="file">{t("selectFile")}</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              disabled={isUploading}
              className="cursor-pointer"
            />
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

          {/* Expiry date (optional) */}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">{t("expiryDate")} ({tCommon("optional")})</Label>
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
            disabled={!selectedFile || isUploading}
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
