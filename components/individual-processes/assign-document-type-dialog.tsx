"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, FileType, File, AlertCircle } from "lucide-react";
import { formatFileSize } from "@/lib/validations/documents-delivered";

interface AssignDocumentTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: Id<"documentsDelivered">;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
  onSuccess?: () => void;
}

export function AssignDocumentTypeDialog({
  open,
  onOpenChange,
  document,
  onSuccess,
}: AssignDocumentTypeDialogProps) {
  const t = useTranslations("DocumentUpload");
  const tCommon = useTranslations("Common");

  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch all active document types
  const documentTypes = useQuery(api.documentTypes.list, { isActive: true });

  const assignType = useMutation(api.documentsDelivered.assignType);

  // Get the selected document type details
  const selectedDocumentType = documentTypes?.find(
    (dt) => dt._id === selectedDocumentTypeId
  );

  // Check if the file is compatible with the selected document type
  const getCompatibilityStatus = () => {
    if (!selectedDocumentType) return null;

    const allowedFormats = selectedDocumentType.allowedFileTypes || [];
    const maxSizeMB = selectedDocumentType.maxFileSizeMB || 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    const issues: string[] = [];

    // Check file size
    if (document.fileSize > maxSizeBytes) {
      issues.push(t("errorFileSizeExceeds", { maxSize: maxSizeMB }));
    }

    // Check file type
    if (allowedFormats.length > 0) {
      const fileExtension = document.fileName
        .substring(document.fileName.lastIndexOf("."))
        .toLowerCase();
      if (!allowedFormats.some((f) => f.toLowerCase() === fileExtension)) {
        issues.push(t("errorFileTypeNotAllowed", { formats: allowedFormats.join(", ") }));
      }
    }

    return issues;
  };

  const compatibilityIssues = getCompatibilityStatus();
  const isCompatible = compatibilityIssues && compatibilityIssues.length === 0;

  const handleAssign = async () => {
    if (!selectedDocumentTypeId) {
      toast.error(t("errorNoDocumentType"));
      return;
    }

    if (!isCompatible) {
      toast.error(t("errorIncompatibleFile"));
      return;
    }

    try {
      setIsAssigning(true);

      await assignType({
        documentId: document.id,
        documentTypeId: selectedDocumentTypeId as Id<"documentTypes">,
      });

      toast.success(t("assignSuccess"));
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setSelectedDocumentTypeId("");
    } catch (error) {
      console.error("Error assigning document type:", error);
      toast.error(t("assignError"));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    if (!isAssigning) {
      setSelectedDocumentTypeId("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileType className="h-5 w-5" />
            <DialogTitle>{t("assignTypeTitle")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("assignTypeDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current document info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{document.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(document.fileSize)} • {document.mimeType}
              </p>
            </div>
            <Badge variant="outline" className="flex-shrink-0">
              {t("looseDocument")}
            </Badge>
          </div>

          {/* Document type selector */}
          <div className="space-y-2">
            <Label>{t("documentType")}</Label>
            {!documentTypes ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedDocumentTypeId}
                onValueChange={setSelectedDocumentTypeId}
                disabled={isAssigning}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectDocumentType")} />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((dt) => (
                    <SelectItem key={dt._id} value={dt._id}>
                      {dt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected document type details */}
          {selectedDocumentType && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              {selectedDocumentType.description && (
                <p className="text-sm text-foreground">{selectedDocumentType.description}</p>
              )}
              {selectedDocumentType.allowedFileTypes && selectedDocumentType.allowedFileTypes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{t("allowedFormats")}:</span>
                  {selectedDocumentType.allowedFileTypes.map((format) => (
                    <Badge key={format} variant="secondary" className="text-xs">
                      {format}
                    </Badge>
                  ))}
                </div>
              )}
              {selectedDocumentType.maxFileSizeMB && (
                <p className="text-sm text-muted-foreground">
                  {t("maxSize")}: {selectedDocumentType.maxFileSizeMB} MB
                </p>
              )}
            </div>
          )}

          {/* Compatibility warning */}
          {compatibilityIssues && compatibilityIssues.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  {t("incompatibleFile")}
                </p>
                <ul className="text-sm text-destructive/80 list-disc list-inside">
                  {compatibilityIssues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Compatibility success */}
          {isCompatible && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <FileType className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                {t("compatibleFile")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isAssigning}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!selectedDocumentTypeId || !isCompatible || isAssigning}
          >
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("assign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
