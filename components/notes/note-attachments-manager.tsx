"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Download,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Loader2,
  Paperclip,
  RotateCcw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileViewer } from "@/components/ui/file-viewer";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

type PendingStatus = "queued" | "uploading" | "error";

interface PendingAttachment {
  id: string;
  file: File;
  progress: number;
  status: PendingStatus;
  error?: string;
}

interface PreviewFile {
  url: string;
  fileName: string;
  mimeType: string;
  revokeOnClose?: boolean;
}

export interface NoteAttachmentsManagerHandle {
  uploadPendingFiles: (noteId: Id<"notes">) => Promise<{
    uploaded: number;
    failed: number;
  }>;
  clearPendingFiles: () => void;
}

interface NoteAttachmentsManagerProps {
  noteId?: Id<"notes">;
  disabled?: boolean;
  onPendingChange?: (hasPendingFiles: boolean) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) {
    return FileText;
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    ["csv", "xls", "xlsx", "ods"].includes(extension ?? "")
  ) {
    return FileSpreadsheet;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension ?? "")) {
    return FileArchive;
  }
  return File;
}

function uploadFile(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void,
  onXhr: (xhr: XMLHttpRequest) => void,
): Promise<Id<"_storage">> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    onXhr(xhr);
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.timeout = 125_000;

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("UPLOAD_FAILED"));
        return;
      }
      try {
        const response = JSON.parse(xhr.responseText) as { storageId?: string };
        if (!response.storageId) throw new Error("UPLOAD_FAILED");
        resolve(response.storageId as Id<"_storage">);
      } catch (error) {
        reject(error);
      }
    });
    xhr.addEventListener("error", () => reject(new Error("NETWORK_ERROR")));
    xhr.addEventListener("timeout", () => reject(new Error("UPLOAD_TIMEOUT")));
    xhr.addEventListener("abort", () => reject(new Error("UPLOAD_CANCELED")));
    xhr.send(file);
  });
}

export const NoteAttachmentsManager = forwardRef<
  NoteAttachmentsManagerHandle,
  NoteAttachmentsManagerProps
>(function NoteAttachmentsManager(
  {
    noteId,
    disabled = false,
    onPendingChange,
    onUploadingChange,
  },
  ref,
) {
  const t = useTranslations("Notes");
  const tCommon = useTranslations("Common");
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRequestsRef = useRef(new Map<string, XMLHttpRequest>());
  const previewRef = useRef<PreviewFile | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Id<"noteAttachments"> | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const attachments = useQuery(
    api.noteAttachments.list,
    noteId ? { noteId } : "skip",
  );
  const generateUploadUrl = useMutation(api.noteAttachments.generateUploadUrl);
  const attachFile = useMutation(api.noteAttachments.attach);
  const discardUpload = useMutation(api.noteAttachments.discardUnlinkedUpload);
  const removeAttachment = useMutation(api.noteAttachments.remove);

  useEffect(() => {
    onPendingChange?.(pendingFiles.length > 0);
  }, [onPendingChange, pendingFiles.length]);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  useEffect(
    () => () => {
      activeRequestsRef.current.forEach((xhr) => xhr.abort());
      const currentPreview = previewRef.current;
      if (currentPreview?.revokeOnClose) {
        URL.revokeObjectURL(currentPreview.url);
      }
    },
    [],
  );

  const addFiles = (files: File[]) => {
    const oversized = files.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      toast.error(t("attachmentTooLarge", { count: oversized.length }));
    }

    const accepted = files.filter((file) => file.size <= MAX_FILE_SIZE_BYTES);
    setPendingFiles((current) => {
      const known = new Set(
        current.map(
          ({ file }) => `${file.name}:${file.size}:${file.lastModified}`,
        ),
      );
      const additions = accepted
        .filter(
          (file) =>
            !known.has(`${file.name}:${file.size}:${file.lastModified}`),
        )
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          progress: 0,
          status: "queued" as const,
        }));
      return [...current, ...additions];
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const updatePending = (
    id: string,
    update: Partial<Omit<PendingAttachment, "id" | "file">>,
  ) => {
    setPendingFiles((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
  };

  useImperativeHandle(
    ref,
    () => ({
      clearPendingFiles: () => setPendingFiles([]),
      uploadPendingFiles: async (targetNoteId) => {
        const filesToUpload = pendingFiles.filter(
          (item) => item.status === "queued" || item.status === "error",
        );
        if (filesToUpload.length === 0) return { uploaded: 0, failed: 0 };

        onUploadingChange?.(true);
        let uploaded = 0;
        let failed = 0;

        for (const item of filesToUpload) {
          let storageId: Id<"_storage"> | undefined;
          updatePending(item.id, {
            status: "uploading",
            progress: 0,
            error: undefined,
          });
          try {
            const uploadUrl = await generateUploadUrl({});
            storageId = await uploadFile(
              uploadUrl,
              item.file,
              (progress) => updatePending(item.id, { progress }),
              (xhr) => activeRequestsRef.current.set(item.id, xhr),
            );
            activeRequestsRef.current.delete(item.id);

            const result = await attachFile({
              noteId: targetNoteId,
              storageId,
              fileName: item.file.name,
            });
            if (result.status === "too_large") {
              storageId = undefined;
              throw new Error(t("attachmentExceedsLimit"));
            }
            uploaded += 1;
            setPendingFiles((current) =>
              current.filter((pending) => pending.id !== item.id),
            );
          } catch (error) {
            activeRequestsRef.current.delete(item.id);
            if (storageId) {
              await discardUpload({ storageId }).catch(() => false);
            }
            failed += 1;
            const errorCode = error instanceof Error ? error.message : "";
            const localizedError =
              errorCode === "NETWORK_ERROR"
                ? t("attachmentNetworkError")
                : errorCode === "UPLOAD_TIMEOUT"
                  ? t("attachmentTimeoutError")
                  : errorCode === "UPLOAD_CANCELED"
                    ? t("attachmentCanceledError")
                    : errorCode === t("attachmentExceedsLimit")
                      ? errorCode
                      : t("attachmentUploadError");
            updatePending(item.id, {
              status: "error",
              error: localizedError,
            });
          }
        }

        onUploadingChange?.(false);
        return { uploaded, failed };
      },
    }),
    [
      attachFile,
      discardUpload,
      generateUploadUrl,
      onUploadingChange,
      pendingFiles,
      t,
    ],
  );

  const openPreview = (
    url: string,
    fileName: string,
    mimeType: string,
    revokeOnClose = false,
  ) => {
    setPreview({ url, fileName, mimeType, revokeOnClose });
  };

  const closePreview = () => {
    if (preview?.revokeOnClose) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await removeAttachment({ id: deleteTarget });
      toast.success(t("attachmentDeleted"));
      setDeleteTarget(null);
    } catch {
      toast.error(t("attachmentDeleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="size-4 text-muted-foreground" />
            {t("attachments")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("attachmentsDescription")}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {t("attachmentLimit")}
        </span>
      </div>

      <label
        className={cn(
          "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-5 text-center transition-colors",
          "hover:border-primary/50 hover:bg-muted/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30",
          isDragging && "border-primary bg-primary/5",
          disabled && "pointer-events-none opacity-50",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
        />
        <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
          <UploadCloud className="size-5" />
        </span>
        <span className="text-sm font-medium">{t("dropAttachments")}</span>
        <span className="text-xs text-muted-foreground">
          {t("anyFileType")}
        </span>
      </label>

      {(pendingFiles.length > 0 || (attachments && attachments.length > 0)) && (
        <div className="overflow-hidden rounded-xl border">
          <div className="divide-y">
            {pendingFiles.map((item) => {
              const Icon = getFileIcon(item.file.type, item.file.name);
              return (
                <div key={item.id} className="flex min-w-0 items-center gap-3 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatFileSize(item.file.size)}
                      </span>
                    </div>
                    {item.status === "uploading" ? (
                      <div className="mt-2 flex items-center gap-2" aria-live="polite">
                        <Progress value={item.progress} className="h-1.5 flex-1" />
                        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                          {item.progress}%
                        </span>
                      </div>
                    ) : item.status === "error" ? (
                      <p className="mt-1 line-clamp-2 text-xs text-destructive">
                        {item.error}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("readyToUpload")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {item.status === "error" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() =>
                          updatePending(item.id, {
                            status: "queued",
                            progress: 0,
                            error: undefined,
                          })
                        }
                        aria-label={t("retryAttachment")}
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        openPreview(
                          URL.createObjectURL(item.file),
                          item.file.name,
                          item.file.type || "application/octet-stream",
                          true,
                        )
                      }
                      disabled={item.status === "uploading"}
                      aria-label={t("previewAttachment")}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setPendingFiles((current) =>
                          current.filter((pending) => pending.id !== item.id),
                        )
                      }
                      disabled={item.status === "uploading"}
                      aria-label={t("removeAttachment")}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {attachments?.map((attachment) => {
              const Icon = getFileIcon(attachment.mimeType, attachment.fileName);
              return (
                <div
                  key={attachment._id}
                  className="flex min-w-0 items-center gap-3 p-3"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={attachment.fileName}>
                      {attachment.fileName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatFileSize(attachment.fileSize)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={!attachment.url}
                      onClick={() =>
                        attachment.url &&
                        openPreview(
                          attachment.url,
                          attachment.fileName,
                          attachment.mimeType,
                        )
                      }
                      aria-label={t("previewAttachment")}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={!attachment.url}
                      asChild={Boolean(attachment.url)}
                      aria-label={t("downloadAttachment")}
                    >
                      {attachment.url ? (
                        <a
                          href={attachment.url}
                          download={attachment.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="size-4" />
                        </a>
                      ) : (
                        <Download className="size-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(attachment._id)}
                      aria-label={t("deleteAttachment")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-h-[92vh] max-w-[96vw] overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="truncate pr-8">{preview?.fileName}</DialogTitle>
            <DialogDescription>
              {preview ? preview.mimeType : t("attachmentPreview")}
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="min-h-0 overflow-auto p-4">
              <FileViewer
                fileUrl={preview.url}
                fileName={preview.fileName}
                mimeType={preview.mimeType}
                className="min-h-[55vh]"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAttachmentTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAttachmentDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
