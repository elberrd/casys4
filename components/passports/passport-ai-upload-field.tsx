"use client"

import { useEffect, useRef, useState } from "react"
import { useAction, useMutation } from "convex/react"
import { Clock3, File as FileIcon, Loader2, Sparkles, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  adminPassportOcrSchema,
  passportUploadResponseSchema,
} from "@/lib/validations/passport-ocr"
import {
  PASSPORT_OCR_MAX_ATTEMPTS,
  PassportOcrAttemptsExhaustedError,
  runPassportOcrWithRetries,
} from "@/lib/passport-ocr-retry"

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const

export interface ExtractedAdminPassportFields {
  passportNumber: string
  issuingCountryId: Id<"countries">
  issueDate: string
  expiryDate: string
}

interface CurrentPassportFields {
  passportNumber: string
  issuingCountryId: string
  issueDate: string
  expiryDate: string
}

interface PassportAiUploadFieldProps {
  selectedFile: File | null
  currentFileUrl?: string
  currentFields: CurrentPassportFields
  disabled?: boolean
  onSelectedFileChange: (file: File | null) => void
  onCurrentFileRemove: () => void
  onStorageIdChange: (storageId: Id<"_storage"> | undefined) => void
  onApplyExtractedFields: (fields: ExtractedAdminPassportFields) => void
  onProcessingChange?: (processing: boolean) => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const units = ["Bytes", "KB", "MB", "GB"]
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = Math.round((bytes / 1024 ** unitIndex) * 100) / 100

  return `${value} ${units[unitIndex]}`
}

class IncompletePassportOcrError extends Error {
  constructor() {
    super("Passport OCR returned incomplete fields")
    this.name = "IncompletePassportOcrError"
  }
}

export function PassportAiUploadField({
  selectedFile,
  currentFileUrl,
  currentFields,
  disabled = false,
  onSelectedFileChange,
  onCurrentFileRemove,
  onStorageIdChange,
  onApplyExtractedFields,
  onProcessingChange,
}: PassportAiUploadFieldProps) {
  const t = useTranslations("Passports")
  const tCommon = useTranslations("Common")
  const generateUploadUrl = useMutation(api.passportUpload.generateUploadUrl)
  const extractPassport = useAction(api.passportOcr.extractPassport)

  const inputRef = useRef<HTMLInputElement>(null)
  const aiInputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const processingRef = useRef(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrAttempt, setOcrAttempt] = useState<number | null>(null)
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false)

  useEffect(() => {
    // React Strict Mode runs the setup/cleanup cycle twice in development.
    // Reset the flag in setup so the second mount remains interactive.
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  const hasExistingTargetValues = Object.values(currentFields).some(Boolean)
  const controlsDisabled = disabled || isProcessing

  const resetSelectedFile = () => {
    onSelectedFileChange(null)
    onStorageIdChange(undefined)
    setOcrAttempt(null)
    setConfirmationDialogOpen(false)
    if (inputRef.current) inputRef.current.value = ""
    if (aiInputRef.current) aiInputRef.current.value = ""
  }

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ): File | null => {
    const file = event.target.files?.[0]
    if (!file) return null

    if (!ACCEPTED_FILE_TYPES.some((type) => type === file.type)) {
      toast.error(t("invalidFileType"))
      event.target.value = ""
      return null
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(t("errorFileSize", { maxSize: MAX_FILE_SIZE_MB }))
      event.target.value = ""
      return null
    }

    onStorageIdChange(undefined)
    onSelectedFileChange(file)
    return file
  }

  const processWithAi = async (fileOverride?: File) => {
    const passportFile = fileOverride ?? selectedFile
    if (!passportFile || processingRef.current || controlsDisabled) return

    processingRef.current = true
    setIsProcessing(true)
    // Show feedback immediately, including while the document is uploaded.
    // The retry helper will keep this value in sync for attempts 2 and 3.
    setOcrAttempt(1)
    onProcessingChange?.(true)

    try {
      const uploadUrl = await generateUploadUrl()
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": passportFile.type },
        body: passportFile,
      })

      if (!uploadResponse.ok) throw new Error("Passport upload failed")

      const uploadResult = passportUploadResponseSchema.parse(
        await uploadResponse.json()
      )

      if (mountedRef.current) {
        onStorageIdChange(uploadResult.storageId)
      }

      const extractedFields = await runPassportOcrWithRetries(
        async () => {
          if (!mountedRef.current) {
            throw new Error("Passport form was closed")
          }

          const rawResult = await extractPassport({
            storageId: uploadResult.storageId,
          })
          const result = adminPassportOcrSchema.safeParse(rawResult)

          if (!result.success || result.data.error) {
            throw new Error("Passport OCR returned an invalid response")
          }

          const { passportNumber, issueDate, expiryDate } = result.data.extracted
          const issuingCountryId = result.data.issuingCountryId

          if (!passportNumber || !issuingCountryId || !issueDate || !expiryDate) {
            throw new IncompletePassportOcrError()
          }

          return {
            passportNumber,
            issuingCountryId,
            issueDate,
            expiryDate,
          }
        },
        {
          onAttempt: (attempt) => {
            if (mountedRef.current) setOcrAttempt(attempt)
          },
        }
      )

      if (mountedRef.current) {
        onApplyExtractedFields(extractedFields)
        toast.success(t("aiReadSuccess"))
      }
    } catch (error) {
      if (mountedRef.current) {
        if (error instanceof PassportOcrAttemptsExhaustedError) {
          toast.error(
            error.lastError instanceof IncompletePassportOcrError
              ? t("aiIncompleteError")
              : t("aiAttemptsExhausted", {
                  max: PASSPORT_OCR_MAX_ATTEMPTS,
                })
          )
        } else {
          toast.error(t("aiReadError"))
        }
      }
    } finally {
      processingRef.current = false
      if (mountedRef.current) {
        setIsProcessing(false)
        setOcrAttempt(null)
        onProcessingChange?.(false)
      }
    }
  }

  const handleAiClick = () => {
    if (controlsDisabled) return
    setConfirmationDialogOpen(true)
  }

  const handleAiFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = handleFileSelect(event)
    if (!file) return

    await processWithAi(file)
    if (mountedRef.current) setConfirmationDialogOpen(false)
  }

  const handleAiConfirm = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()

    if (!selectedFile) {
      aiInputRef.current?.click()
      return
    }

    await processWithAi()
    if (mountedRef.current) setConfirmationDialogOpen(false)
  }

  return (
    <div className="space-y-3">
      <input
        ref={aiInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES.join(",")}
        onChange={(event) => void handleAiFileSelect(event)}
        disabled={controlsDisabled}
        hidden
      />

      <Button
        type="button"
        variant="outline"
        onClick={handleAiClick}
        disabled={controlsDisabled}
        aria-label={t("aiReadButton")}
        className="w-full sm:w-auto"
      >
        {isProcessing ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Sparkles />
        )}
        {isProcessing ? t("aiReadingButton") : t("aiReadButton")}
      </Button>

      <div className="space-y-2">
        <Label htmlFor="passport-document-file">{t("fileUpload")}</Label>
        <Input
          id="passport-document-file"
          type="file"
          ref={inputRef}
          accept={ACCEPTED_FILE_TYPES.join(",")}
          onChange={handleFileSelect}
          disabled={controlsDisabled}
          className="cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          {t("uploadHint", { maxSize: MAX_FILE_SIZE_MB })}
        </p>
      </div>

      {selectedFile ? (
        <div className="flex min-w-0 items-center gap-3 rounded-lg bg-muted p-3">
          <FileIcon className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetSelectedFile}
            disabled={controlsDisabled}
            className="shrink-0"
            aria-label={t("removeFile")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : currentFileUrl ? (
        <div className="flex min-w-0 items-center gap-3 rounded-lg bg-muted p-3">
          <FileIcon className="h-8 w-8 shrink-0 text-muted-foreground" />
          <a
            href={currentFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-sm font-medium text-primary hover:underline"
          >
            {t("viewCurrentFile")}
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCurrentFileRemove}
            disabled={controlsDisabled}
            className="shrink-0"
            aria-label={t("removeFile")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <AlertDialog
        open={confirmationDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!isProcessing) setConfirmationDialogOpen(nextOpen)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasExistingTargetValues
                ? t("aiOverwriteTitle")
                : t("aiConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasExistingTargetValues
                ? t("aiOverwriteDescription")
                : t("aiConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Alert className="border-amber-200 bg-amber-50/60 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            {isProcessing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Clock3 />
            )}
            <AlertDescription
              className="text-current/80"
              aria-live="polite"
              aria-atomic="true"
            >
              {isProcessing && ocrAttempt
                ? t("aiAttempt", {
                    attempt: ocrAttempt,
                    max: PASSPORT_OCR_MAX_ATTEMPTS,
                  })
                : t("aiWaitNotice")}
            </AlertDescription>
          </Alert>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isProcessing}
              onClick={(event) => void handleAiConfirm(event)}
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {isProcessing
                ? t("aiReadingButton")
                : selectedFile
                  ? t("aiOverwriteConfirm")
                  : t("aiSelectDocumentConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
