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
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Upload, File, X, CheckCircle } from "lucide-react"
import { formatFileSize } from "@/lib/validations/documents-delivered"

interface UploadNewVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  individualProcessId: Id<"individualProcesses">
  documentTypeId: Id<"documentTypes">
  documentRequirementId?: Id<"documentRequirements">
  currentVersion: number
  currentFileName: string
  currentFileSize: number
  currentStatus: string
  onSuccess?: () => void
}

export function UploadNewVersionDialog({
  open,
  onOpenChange,
  individualProcessId,
  documentTypeId,
  documentRequirementId,
  currentVersion,
  currentFileName,
  currentFileSize,
  currentStatus,
  onSuccess,
}: UploadNewVersionDialogProps) {
  const t = useTranslations("DocumentUpload")
  const tCommon = useTranslations("Common")

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [expiryDate, setExpiryDate] = useState<string>("")
  const [versionNotes, setVersionNotes] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.documentsDelivered.generateUploadUrl)
  const uploadDocument = useMutation(api.documentsDelivered.upload)

  const nextVersion = currentVersion + 1

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
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

      const uploadUrl = await generateUploadUrl()
      setUploadProgress(20)

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

      await uploadDocument({
        individualProcessId,
        documentTypeId,
        documentRequirementId,
        storageId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        expiryDate: expiryDate || undefined,
        versionNotes: versionNotes || undefined,
      })

      setUploadProgress(100)
      toast.success(t("successUpload"))
      onOpenChange(false)
      onSuccess?.()

      handleRemoveFile()
      setExpiryDate("")
      setVersionNotes("")
      setUploadProgress(0)
    } catch (error) {
      console.error("Error uploading document:", error)
      toast.error(t("errorUpload"))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <DialogTitle>{t("uploadNewVersionTitle")}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {t("versionUpgrade", { current: currentVersion, next: nextVersion })}
          </DialogDescription>
          <Badge variant="secondary" className="mt-1">
            {t("versionUpgrade", { current: currentVersion, next: nextVersion })}
          </Badge>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current version info */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("currentVersion")}</p>
            <p className="text-sm font-medium truncate">{currentFileName}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(currentFileSize)}</p>
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

          {/* Version notes */}
          <div className="space-y-2">
            <Label htmlFor="versionNotes">{t("versionNotes")} ({tCommon("optional")})</Label>
            <Textarea
              id="versionNotes"
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder={t("versionNotesPlaceholder")}
              maxLength={500}
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Expiry date */}
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
