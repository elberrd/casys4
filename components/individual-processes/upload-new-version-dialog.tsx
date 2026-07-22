"use client"

import { useState, useRef, useMemo } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Loader2, Upload, File, X, CheckCircle, AlertTriangle, Info, ClipboardCheck } from "lucide-react"
import { formatFileSize } from "@/lib/validations/documents-delivered"
import {
  DocumentReceivedDateField,
  getDefaultReceivedDate,
  getReceivedDateOverride,
} from "./document-received-date-field"
import {
  DocumentWaitingStartDateField,
  useDocumentWaitingStartDate,
} from "./document-waiting-start-date-field"

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
  canEditReceivedDate?: boolean
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
  canEditReceivedDate = false,
  onSuccess,
}: UploadNewVersionDialogProps) {
  const t = useTranslations("DocumentUpload")
  const tCommon = useTranslations("Common")

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [expiryDate, setExpiryDate] = useState<string>("")
  const [issueDate, setIssueDate] = useState<string>("")
  const [versionNotes, setVersionNotes] = useState<string>("")
  const [receivedDate, setReceivedDate] = useState(getDefaultReceivedDate)
  const [fulfilledConditionIds, setFulfilledConditionIds] = useState<Set<string>>(new Set())
  const [isIllegible, setIsIllegible] = useState(false)
  const [illegibleNotes, setIllegibleNotes] = useState("")
  const [autoApprove, setAutoApprove] = useState(false)
  const [bypassConditions, setBypassConditions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    waitingStartDate,
    setWaitingStartDate,
    defaultWaitingStartDate,
    isWaitingStartDateLoading,
    isWaitingStartDateValid,
    waitingStartDateOverride,
  } = useDocumentWaitingStartDate({
    open,
    canEdit: canEditReceivedDate,
    individualProcessId,
  })

  const generateUploadUrl = useMutation(api.documentsDelivered.generateUploadUrl)
  const uploadDocument = useMutation(api.documentsDelivered.upload)

  // Fetch conditions for this document type
  const conditions = useQuery(
    api.documentTypeConditions.listActiveByDocumentType,
    { documentTypeId }
  )

  const hasUnfulfilledRequiredConditions = useMemo(() => {
    if (!conditions || conditions.length === 0) return false
    return conditions.some(c => c.isRequired && !fulfilledConditionIds.has(c._id))
  }, [conditions, fulfilledConditionIds])

  const isAutoApproveBlocked = autoApprove && hasUnfulfilledRequiredConditions && !bypassConditions

  const nextVersion = currentVersion + 1

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setAutoApprove(true)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setAutoApprove(false)
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
        issueDate: issueDate || undefined,
        versionNotes: versionNotes || undefined,
        preFulfilledConditionIds: fulfilledConditionIds.size > 0
          ? Array.from(fulfilledConditionIds) as any
          : undefined,
        isIllegible: isIllegible || undefined,
        rejectionReason: isIllegible && illegibleNotes.trim() ? illegibleNotes.trim() : undefined,
        autoApprove: autoApprove || undefined,
        bypassConditions: bypassConditions || undefined,
        waitingStartDate: waitingStartDateOverride,
        receivedDate: canEditReceivedDate
          ? getReceivedDateOverride(receivedDate)
          : undefined,
      })

      setUploadProgress(100)
      toast.success(t("successUpload"))
      onOpenChange(false)
      onSuccess?.()

      handleRemoveFile()
      setExpiryDate("")
      setIssueDate("")
      setVersionNotes("")
      setReceivedDate(getDefaultReceivedDate())
      setFulfilledConditionIds(new Set())
      setIsIllegible(false)
      setIllegibleNotes("")
      setAutoApprove(false)
      setBypassConditions(false)
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
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
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

          {/* Auto-approve checkbox */}
          {selectedFile && !isIllegible && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoApprove"
                checked={autoApprove}
                onCheckedChange={(checked) => setAutoApprove(checked === true)}
                disabled={isUploading}
              />
              <label htmlFor="autoApprove" className="text-sm font-medium cursor-pointer">
                {t("autoApprove")}
              </label>
            </div>
          )}

          <DocumentWaitingStartDateField
            canEdit={canEditReceivedDate}
            value={waitingStartDate}
            defaultDate={defaultWaitingStartDate}
            onChange={setWaitingStartDate}
            disabled={isUploading}
            loading={isWaitingStartDateLoading}
            id="new-version-waiting-start-date"
          />

          <DocumentReceivedDateField
            canEdit={canEditReceivedDate}
            value={receivedDate}
            onChange={setReceivedDate}
            disabled={isUploading}
            id="new-version-received-date"
          />

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

          {/* Illegible document option */}
          <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 p-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isIllegible"
                checked={isIllegible}
                onCheckedChange={(checked) => {
                  setIsIllegible(checked === true)
                  if (checked) setAutoApprove(false)
                }}
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
              <div className={cn("space-y-2 rounded-lg border p-3", isAutoApproveBlocked && "border-red-500 border-2")}>
                {conditions.map((condition) => (
                  <div key={condition._id} className="flex items-start gap-2">
                    <Checkbox
                      id={`condition-${condition._id}`}
                      checked={bypassConditions || fulfilledConditionIds.has(condition._id)}
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
                      disabled={isUploading || bypassConditions}
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
                {isAutoApproveBlocked && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                    {t("conditionsRequiredForAutoApprove")}
                  </p>
                )}
              </div>
              {/* Bypass conditions toggle */}
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-3">
                <Checkbox
                  id="bypass-conditions-version"
                  checked={bypassConditions}
                  onCheckedChange={(checked) => setBypassConditions(checked === true)}
                  disabled={isUploading}
                />
                <div className="grid gap-0.5 leading-none">
                  <label htmlFor="bypass-conditions-version" className="text-sm font-medium cursor-pointer">
                    {t("bypassConditions")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t("bypassConditionsHint")}
                  </p>
                </div>
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
            variant={isIllegible ? "destructive" : "default"}
            onClick={handleUpload}
            disabled={
              !selectedFile ||
              isUploading ||
              isAutoApproveBlocked ||
              (canEditReceivedDate && !isWaitingStartDateValid)
            }
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isIllegible ? t("uploadAsIllegible") : t("upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
