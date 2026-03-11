"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
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
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Loader2, Upload, File, X, CheckCircle, AlertTriangle, Info, RotateCcw, ClipboardCheck } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  individualProcessId: Id<"individualProcesses">
  documentTypeId: Id<"documentTypes">
  documentRequirementId?: Id<"documentRequirements">
  existingDocumentId?: Id<"documentsDelivered">
  existingVersionNotes?: string
  documentInfo?: {
    name: string
    description?: string
    maxSizeMB?: number
    allowedFormats?: string[]
  }
  validityRule?: {
    validityType: string
    validityDays: number
  }
  companyReuse?: {
    companyApplicantId: Id<"companies">
    targetDocumentId: Id<"documentsDelivered">
    documentTypeName: string
  }
  onReuseClick?: () => void
  onSuccess?: () => void
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  individualProcessId,
  documentTypeId,
  documentRequirementId,
  existingDocumentId,
  existingVersionNotes,
  documentInfo,
  validityRule,
  companyReuse,
  onReuseClick,
  onSuccess,
}: DocumentUploadDialogProps) {
  const t = useTranslations("DocumentUpload")
  const tChecklist = useTranslations("DocumentChecklist")
  const tCommon = useTranslations("Common")

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [expiryDate, setExpiryDate] = useState<string>("")
  const [issueDate, setIssueDate] = useState<string>("")
  const [versionNotes, setVersionNotes] = useState<string>("")
  const [fulfilledConditionIds, setFulfilledConditionIds] = useState<Set<string>>(new Set())
  const [isIllegible, setIsIllegible] = useState(false)
  const [illegibleNotes, setIllegibleNotes] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pre-populate versionNotes when dialog opens with existing notes
  useEffect(() => {
    if (open && existingVersionNotes) {
      setVersionNotes(existingVersionNotes)
    }
  }, [open, existingVersionNotes])

  // Fetch conditions for this document type
  const conditions = useQuery(
    api.documentTypeConditions.listActiveByDocumentType,
    { documentTypeId }
  )

  const reusableDocuments = useQuery(
    api.documentsDelivered.listCompanyDocumentsForReuse,
    companyReuse
      ? {
          companyApplicantId: companyReuse.companyApplicantId,
          documentTypeId,
          excludeProcessId: individualProcessId,
        }
      : "skip"
  )

  const generateUploadUrl = useMutation(api.documentsDelivered.generateUploadUrl)
  const uploadDocument = useMutation(api.documentsDelivered.upload)
  const updateVersionNotes = useMutation(api.documentsDelivered.updateVersionNotes)

  // Client-side validity warning
  const validityWarning = useMemo(() => {
    if (!validityRule) return null
    const { validityType, validityDays } = validityRule
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (validityType === "min_remaining" && expiryDate) {
      const expiry = new Date(expiryDate)
      expiry.setHours(0, 0, 0, 0)
      const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysRemaining < validityDays) {
        return { type: "error" as const, message: t("validityWarningInsufficient", { days: daysRemaining, required: validityDays }) }
      }
    }
    if (validityType === "max_age" && issueDate) {
      const issued = new Date(issueDate)
      issued.setHours(0, 0, 0, 0)
      const daysSinceIssue = Math.floor((today.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceIssue > validityDays) {
        return { type: "error" as const, message: t("validityWarningMaxAge", { days: daysSinceIssue, max: validityDays }) }
      }
    }
    return null
  }, [validityRule, expiryDate, issueDate, t])

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

  const handleSaveNotesOnly = async () => {
    if (!existingDocumentId || !versionNotes.trim()) return

    try {
      setIsUploading(true)
      await updateVersionNotes({
        documentId: existingDocumentId,
        versionNotes: versionNotes.trim(),
      })
      toast.success(t("successSaveNotes"))
      onOpenChange(false)
      onSuccess?.()

      // Reset form
      setVersionNotes("")
      setExpiryDate("")
      setIssueDate("")
      setFulfilledConditionIds(new Set())
      setIsIllegible(false)
      setIllegibleNotes("")
    } catch (error) {
      console.error("Error saving notes:", error)
      toast.error(t("errorUpload"))
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      // No file - save notes only
      await handleSaveNotesOnly()
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
        issueDate: issueDate || undefined,
        versionNotes: versionNotes || undefined,
        preFulfilledConditionIds: fulfilledConditionIds.size > 0
          ? Array.from(fulfilledConditionIds) as any
          : undefined,
        isIllegible: isIllegible || undefined,
        rejectionReason: isIllegible && illegibleNotes.trim() ? illegibleNotes.trim() : undefined,
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
      setIssueDate("")
      setVersionNotes("")
      setFulfilledConditionIds(new Set())
      setIsIllegible(false)
      setIllegibleNotes("")
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
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <DialogTitle>{t("title")}</DialogTitle>
          </div>
          <DialogDescription>
            {documentInfo?.name && (
              <span className="mt-2 block">
                <span className="font-medium text-foreground">{documentInfo.name}</span>
                {documentInfo.description && (
                  <span className="text-sm mt-1 block">{documentInfo.description}</span>
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Reuse hint for company documents */}
        {companyReuse && reusableDocuments && reusableDocuments.length > 0 && onReuseClick && (
          <button
            type="button"
            onClick={onReuseClick}
            className="flex w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-left text-sm transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="flex-1 text-blue-800 dark:text-blue-200">
              {tChecklist("reuseHint", { count: reusableDocuments.length })}
            </span>
          </button>
        )}

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

          {/* Illegible checkbox */}
          <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 p-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isIllegible"
                checked={isIllegible}
                onCheckedChange={(checked) => setIsIllegible(checked === true)}
                disabled={isUploading}
              />
              <Label htmlFor="isIllegible" className="text-sm font-medium cursor-pointer">
                {t("markAsIllegible")}
              </Label>
            </div>
            {isIllegible && (
              <>
                <p className="text-xs text-orange-700 dark:text-orange-300 ml-6">
                  {t("illegibleWarning")}
                </p>
                <Textarea
                  value={illegibleNotes}
                  onChange={(e) => setIllegibleNotes(e.target.value)}
                  placeholder={t("illegibleNotesPlaceholder")}
                  maxLength={500}
                  rows={2}
                  disabled={isUploading}
                  className="ml-6 w-[calc(100%-1.5rem)]"
                />
              </>
            )}
          </div>

          {/* Conditions checkboxes */}
          {conditions && conditions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                <Label>{t("conditions")}</Label>
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                {conditions.map((condition) => (
                  <div key={condition._id} className="flex items-start gap-2">
                    <Checkbox
                      id={`condition-${condition._id}`}
                      checked={fulfilledConditionIds.has(condition._id)}
                      onCheckedChange={(checked) => {
                        setFulfilledConditionIds((prev) => {
                          const next = new Set(prev)
                          if (checked) {
                            next.add(condition._id)
                          } else {
                            next.delete(condition._id)
                          }
                          return next
                        })
                      }}
                      disabled={isUploading}
                    />
                    <div className="grid gap-0.5 leading-none">
                      <label
                        htmlFor={`condition-${condition._id}`}
                        className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {condition.name}
                        {condition.isRequired && (
                          <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">
                            {t("conditionRequired")}
                          </Badge>
                        )}
                      </label>
                      {condition.description && (
                        <p className="text-xs text-muted-foreground">
                          {condition.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-1">
                  {t("conditionsHint")}
                </p>
              </div>
            </div>
          )}

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

          {/* Validity warning */}
          {validityWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 p-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {validityWarning.message}
              </p>
            </div>
          )}

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
            disabled={(!selectedFile && (!existingDocumentId || !versionNotes.trim())) || isUploading}
            variant={isIllegible ? "destructive" : "default"}
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isIllegible ? t("uploadAsIllegible") : selectedFile ? t("upload") : t("saveWithoutFile")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
