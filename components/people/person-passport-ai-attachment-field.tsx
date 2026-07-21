"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react"
import { useAction, useMutation } from "convex/react"
import Link from "next/link"
import {
  AlertCircle,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  ScanLine,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import {
  personPassportOcrSchema,
  passportUploadResponseSchema,
  type PersonPassportOcrFields,
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

export interface PersonPassportAttachmentValue {
  storageId: Id<"_storage">
  fileName: string
  mimeType: string
  fileSize: number
  url?: string | null
  file?: File
  persisted: boolean
}

export interface PersonPassportDuplicateWarning {
  passportOwner: {
    personId: Id<"people"> | null
    personName: string
    passportNumber: string
  } | null
  matches: Array<{
    personId: Id<"people">
    fullName: string
  }>
}

export interface PersonPassportVerification {
  storageId: Id<"_storage">
  passportNumber: string
}

interface CurrentPersonFields {
  givenNames: string
  middleName: string
  surname: string
  birthDate: string
  sex: string
  nationalityId: string
  motherName: string
  fatherName: string
}

interface PersonPassportAiAttachmentFieldProps {
  attachment: PersonPassportAttachmentValue | null
  duplicateWarning: PersonPassportDuplicateWarning | null
  currentFields: CurrentPersonFields
  disabled?: boolean
  requiresCreationVerification?: boolean
  onAttachmentChange: (
    attachment: PersonPassportAttachmentValue,
  ) => void | Promise<void>
  onAttachmentRemove: (
    attachment: PersonPassportAttachmentValue,
  ) => void | Promise<void>
  onApplyExtractedPersonFields: (fields: PersonPassportOcrFields) => void
  onDuplicateWarningChange: (
    warning: PersonPassportDuplicateWarning | null,
  ) => void
  onVerificationChange?: (
    verification: PersonPassportVerification | null,
  ) => void
  onProcessingChange?: (processing: boolean) => void
}

class PassportNumberUnreadableError extends Error {
  constructor() {
    super("Passport number could not be read")
    this.name = "PassportNumberUnreadableError"
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = Math.round((bytes / 1024 ** unitIndex) * 10) / 10
  return `${value} ${units[unitIndex]}`
}

export function PersonPassportAiAttachmentField({
  attachment,
  duplicateWarning,
  currentFields,
  disabled = false,
  requiresCreationVerification = false,
  onAttachmentChange,
  onAttachmentRemove,
  onApplyExtractedPersonFields,
  onDuplicateWarningChange,
  onVerificationChange,
  onProcessingChange,
}: PersonPassportAiAttachmentFieldProps) {
  const t = useTranslations("People")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const generateUploadUrl = useMutation(api.passportUpload.generateUploadUrl)
  const discardUnlinkedUpload = useMutation(
    api.personPassportAttachments.discardUnlinkedUpload,
  )
  const extractPassport = useAction(api.passportOcr.extractPassport)

  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const operationVersionRef = useRef(0)
  const processingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [ocrAttempt, setOcrAttempt] = useState<number | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [verificationFailed, setVerificationFailed] = useState(false)
  const [pendingExtractedFields, setPendingExtractedFields] =
    useState<PersonPassportOcrFields | null>(null)

  const hasExistingTargetValues = Object.values(currentFields).some(Boolean)
  const busy = disabled || isUploading || isReading

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      operationVersionRef.current += 1
    }
  }, [])

  useEffect(() => {
    const preventDroppedFileNavigation = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault()
    }
    window.addEventListener("dragover", preventDroppedFileNavigation)
    window.addEventListener("drop", preventDroppedFileNavigation)
    return () => {
      window.removeEventListener("dragover", preventDroppedFileNavigation)
      window.removeEventListener("drop", preventDroppedFileNavigation)
    }
  }, [])

  const setProcessing = useCallback(
    (processing: boolean) => {
      onProcessingChange?.(processing)
    },
    [onProcessingChange],
  )

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_FILE_TYPES.some((type) => type === file.type)) {
      toast.error(t("passportAttachmentInvalidType"))
      return false
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(
        t("passportAttachmentTooLarge", { maxSize: MAX_FILE_SIZE_MB }),
      )
      return false
    }
    return true
  }

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl()
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    })
    if (!response.ok) throw new Error("Passport upload failed")
    return passportUploadResponseSchema.parse(await response.json()).storageId
  }

  const readWithAi = useCallback(
    async (
      storageId: Id<"_storage">,
      options: { applyPersonFields: boolean },
    ) => {
      if (processingRef.current || disabled) return

      const operationVersion = operationVersionRef.current
      processingRef.current = true
      setIsReading(true)
      setOcrAttempt(1)
      setProcessing(true)

      try {
        const parsed = await runPassportOcrWithRetries(
          async () => {
            const rawResult = await extractPassport({
              storageId,
              ...(requiresCreationVerification
                ? { recordForPersonCreation: true }
                : {}),
            })
            const result = personPassportOcrSchema.safeParse(rawResult)
            if (!result.success || result.data.error) {
              throw new Error("Passport OCR returned an invalid response")
            }
            if (!result.data.passportNumber) {
              throw new PassportNumberUnreadableError()
            }
            return result.data
          },
          {
            onAttempt: (attempt) => {
              if (mountedRef.current) setOcrAttempt(attempt)
            },
          },
        )

        if (
          !mountedRef.current ||
          operationVersion !== operationVersionRef.current
        ) {
          return
        }
        const verifiedPassportNumber = parsed.passportNumber
        if (!verifiedPassportNumber) {
          throw new PassportNumberUnreadableError()
        }

        setVerificationFailed(false)
        onVerificationChange?.({
          storageId,
          passportNumber: verifiedPassportNumber,
        })

        const existingPassport =
          parsed.passportExists?.isAvailable === false
            ? parsed.passportExists.existingPassport
            : null
        const warning: PersonPassportDuplicateWarning = {
          passportOwner: existingPassport?.personId
            ? {
                personId: existingPassport.personId,
                personName: existingPassport.personName,
                passportNumber: existingPassport.passportNumber,
              }
            : null,
          matches: parsed.matches.map((match) => ({
            personId: match._id,
            fullName: match.fullName,
          })),
        }
        const nextWarning =
          warning.passportOwner || warning.matches.length > 0 ? warning : null
        onDuplicateWarningChange(nextWarning)

        if (options.applyPersonFields && !warning.passportOwner) {
          if (hasExistingTargetValues) {
            setPendingExtractedFields(parsed.personFields)
            setConfirmationOpen(true)
            toast.success(t("passportVerificationSuccess"))
          } else {
            onApplyExtractedPersonFields(parsed.personFields)
            toast.success(t("passportAiReadSuccess"))
          }
        } else if (!warning.passportOwner) {
          toast.success(t("passportVerificationSuccess"))
        }
      } catch (error) {
        if (
          mountedRef.current &&
          operationVersion === operationVersionRef.current
        ) {
          setVerificationFailed(true)
          onVerificationChange?.(null)
          const passportNumberUnreadable =
            error instanceof PassportOcrAttemptsExhaustedError &&
            error.lastError instanceof PassportNumberUnreadableError
          toast.error(
            passportNumberUnreadable
              ? t("passportVerificationRequired")
              : error instanceof PassportOcrAttemptsExhaustedError
              ? t("passportAiAttemptsExhausted", {
                  max: PASSPORT_OCR_MAX_ATTEMPTS,
                })
              : t("passportAiReadError"),
          )
        }
      } finally {
        processingRef.current = false
        if (mountedRef.current) {
          setIsReading(false)
          setOcrAttempt(null)
          setProcessing(false)
        }
      }
    }, [
      disabled,
      extractPassport,
      hasExistingTargetValues,
      onApplyExtractedPersonFields,
      onDuplicateWarningChange,
      onVerificationChange,
      requiresCreationVerification,
      setProcessing,
      t,
    ],
  )

  const handleFile = async (file: File) => {
    if (!validateFile(file) || busy) return

    const previousAttachment = attachment
    const operationVersion = operationVersionRef.current + 1
    operationVersionRef.current = operationVersion
    setIsUploading(true)
    setProcessing(true)
    let uploadedStorageId: Id<"_storage"> | null = null
    let attachmentAccepted = false

    try {
      const storageId = await uploadFile(file)
      uploadedStorageId = storageId
      if (
        !mountedRef.current ||
        operationVersion !== operationVersionRef.current
      ) {
        await discardUnlinkedUpload({ storageId })
        return
      }

      const nextAttachment: PersonPassportAttachmentValue = {
        storageId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        file,
        persisted: false,
      }
      await onAttachmentChange(nextAttachment)
      attachmentAccepted = true
      setVerificationFailed(false)
      onVerificationChange?.(null)
      onDuplicateWarningChange(null)

      if (previousAttachment) {
        toast.success(t("passportAttachmentReplaced"))
      }
      await readWithAi(storageId, {
        applyPersonFields: !previousAttachment,
      })
    } catch {
      if (uploadedStorageId && !attachmentAccepted) {
        try {
          await discardUnlinkedUpload({ storageId: uploadedStorageId })
        } catch {
          // Keep the original upload error visible. Unlinked-upload cleanup is
          // idempotent and can be retried independently.
        }
      }
      if (mountedRef.current) toast.error(t("passportAttachmentUploadError"))
    } finally {
      if (mountedRef.current) {
        setIsUploading(false)
        setProcessing(false)
      }
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
  }

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    if (!busy) setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (busy) return
    const file = event.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  const handleRemove = async () => {
    if (!attachment || busy) return
    operationVersionRef.current += 1
    try {
      await onAttachmentRemove(attachment)
      setVerificationFailed(false)
      setPendingExtractedFields(null)
      onVerificationChange?.(null)
      onDuplicateWarningChange(null)
    } catch {
      toast.error(t("passportAttachmentRemoveError"))
    }
  }

  const localPreviewUrl = useMemo(
    () => (attachment?.file ? URL.createObjectURL(attachment.file) : null),
    [attachment?.file],
  )
  const previewUrl = localPreviewUrl ?? attachment?.url

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">
          {t("passportAttachmentTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("passportAttachmentDescription")}
        </p>
      </div>

      {attachment ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {isUploading || isReading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <FileText className="size-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {attachment.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.fileSize)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {previewUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                    {t("passportAttachmentView")}
                  </a>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                <RefreshCw />
                {t("passportAttachmentReplace")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  void readWithAi(attachment.storageId, {
                    applyPersonFields: true,
                  })
                }
                disabled={busy}
              >
                <Sparkles />
                {t("passportAttachmentReadAgain")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void handleRemove()}
                disabled={busy}
                aria-label={t("passportAttachmentRemove")}
              >
                <Trash2 />
              </Button>
            </div>
          </div>

          {isReading && (
            <Alert className="mt-4" aria-live="polite">
              <Clock3 />
              <AlertDescription>
                {t("passportAiAttempt", {
                  attempt: ocrAttempt ?? 1,
                  max: PASSPORT_OCR_MAX_ATTEMPTS,
                })}
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <label
          htmlFor="person-passport-attachment"
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
            busy
              ? "cursor-not-allowed opacity-70"
              : "cursor-pointer border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/[0.03]",
            isDragging && "border-primary bg-primary/10",
          )}
        >
          {isUploading ? (
            <Loader2 className="size-9 animate-spin text-primary" />
          ) : isReading ? (
            <ScanLine className="size-9 text-primary" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-6" />
            </div>
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isUploading
                ? t("passportAttachmentUploading")
                : isReading
                  ? t("passportAiReading")
                  : t("passportAttachmentDrop")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("passportAttachmentHint", { maxSize: MAX_FILE_SIZE_MB })}
            </p>
          </div>
        </label>
      )}

      <Input
        id="person-passport-attachment"
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES.join(",")}
        onChange={handleInputChange}
        disabled={busy}
        className="sr-only"
      />

      {attachment && verificationFailed && (
        <Alert variant="destructive" aria-live="assertive">
          <AlertCircle />
          <AlertTitle>{t("passportVerificationTitle")}</AlertTitle>
          <AlertDescription>
            {t("passportVerificationRequired")}
          </AlertDescription>
        </Alert>
      )}

      {duplicateWarning?.passportOwner && (
        <Alert variant="destructive" aria-live="assertive">
          <AlertCircle />
          <AlertTitle>{t("passportDuplicateTitle")}</AlertTitle>
          <AlertDescription>
            <p>
              {t("passportDuplicateDescription", {
                passportNumber:
                  duplicateWarning.passportOwner.passportNumber,
                personName: duplicateWarning.passportOwner.personName,
              })}
            </p>
            {duplicateWarning.passportOwner.personId && (
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link
                  href={`/${locale}/people?editPerson=${duplicateWarning.passportOwner.personId}`}
                >
                  {t("passportDuplicateOpenPerson", {
                    personName: duplicateWarning.passportOwner.personName,
                  })}
                </Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {duplicateWarning && duplicateWarning.matches.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50/60 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertCircle />
          <AlertTitle>{t("personNameMatchTitle")}</AlertTitle>
          <AlertDescription className="text-current/80">
            <p>
              {t("personNameMatchDescription", {
                names: duplicateWarning.matches
                  .map((match) => match.fullName)
                  .join(", "),
              })}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 bg-background"
              onClick={() => {
                const nextWarning = duplicateWarning.passportOwner
                  ? { ...duplicateWarning, matches: [] }
                  : null
                onDuplicateWarningChange(nextWarning)
              }}
            >
              {t("personNameMatchContinue")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <AlertDialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          if (!isReading) {
            setConfirmationOpen(open)
            if (!open) setPendingExtractedFields(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("passportAiOverwriteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("passportAiOverwriteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Alert className="border-amber-200 bg-amber-50/60 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertCircle />
            <AlertDescription className="text-current/80">
              {t("passportAiOverwriteNotice")}
            </AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReading}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isReading || !pendingExtractedFields}
              onClick={(event) => {
                event.preventDefault()
                if (!pendingExtractedFields) return
                onApplyExtractedPersonFields(pendingExtractedFields)
                toast.success(t("passportAiReadSuccess"))
                setConfirmationOpen(false)
                setPendingExtractedFields(null)
              }}
            >
              <Sparkles />
              {t("passportAiConfirmRead")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
