"use client"

import { useState, useRef } from "react"
import { useMutation } from "convex/react"
import { useTranslations } from "next-intl"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Loader2, Upload, File, X, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  individualProcessId: Id<"individualProcesses">
  documentTypeId: Id<"documentTypes">
  documentRequirementId?: Id<"documentRequirements">
  documentInfo?: {
    name: string
    description?: string
    maxSizeMB?: number
    allowedFormats?: string[]
  }
  onSuccess?: () => void
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  individualProcessId,
  documentTypeId,
  documentRequirementId,
  documentInfo,
  onSuccess,
}: DocumentUploadDialogProps) {
  const t = useTranslations("DocumentUpload")
  const tCommon = useTranslations("Common")

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [expiryDate, setExpiryDate] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.documentsDelivered.generateUploadUrl)
  const uploadDocument = useMutation(api.documentsDelivered.upload)

  const maxSizeMB = documentInfo?.maxSizeMB || 10
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  const allowedFormats = documentInfo?.allowedFormats || []

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSizeBytes) {
      toast.error(t("errorFileSize", { maxSize: maxSizeMB }))
      return
    }

    // Validate file format
    if (allowedFormats.length > 0) {
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`
      if (!allowedFormats.includes(fileExtension)) {
        toast.error(t("errorFileFormat", { formats: allowedFormats.join(", ") }))
        return
      }
    }

    setSelectedFile(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t("errorNoFile"))
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(10)

      // Step 1: Get upload URL from Convex
      const uploadUrl = await generateUploadUrl()
      setUploadProgress(20)

      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      })

      if (!result.ok) {
        throw new Error("Failed to upload file")
      }

      const { storageId } = await result.json()
      setUploadProgress(60)

      // Step 3: Create document record in database
      await uploadDocument({
        individualProcessId,
        documentTypeId,
        documentRequirementId,
        storageId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        expiryDate: expiryDate || undefined,
      })

      setUploadProgress(100)

      toast.success(t("successUpload"))
      onOpenChange(false)

      if (onSuccess) {
        onSuccess()
      }

      // Reset form
      handleRemoveFile()
      setExpiryDate("")
      setUploadProgress(0)
    } catch (error) {
      console.error("Error uploading document:", error)
      toast.error(t("errorUpload"))
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <DialogTitle>{t("title")}</DialogTitle>
          </div>
          <DialogDescription>
            {documentInfo?.name && (
              <div className="mt-2">
                <p className="font-medium text-foreground">{documentInfo.name}</p>
                {documentInfo.description && (
                  <p className="text-sm mt-1">{documentInfo.description}</p>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File requirements */}
          {(allowedFormats.length > 0 || maxSizeMB) && (
            <div className="text-sm text-muted-foreground space-y-1">
              {allowedFormats.length > 0 && (
                <p>{t("allowedFormats")}: {allowedFormats.join(", ")}</p>
              )}
              {maxSizeMB && (
                <p>{t("maxSize")}: {maxSizeMB} MB</p>
              )}
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
            onClick={() => onOpenChange(false)}
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
  )
}
