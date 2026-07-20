"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import {
  FileCheck2,
  FileClock,
  Loader2,
  Replace,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type AttachmentMode = "replace" | "new_version"

export type PassportDocumentAttachmentResult =
  | "attached"
  | "skipped"
  | "no_candidate"

interface PassportDocumentAttachmentDialogProps {
  open: boolean
  passportId?: Id<"passports">
  individualProcessId?: Id<"individualProcesses">
  candidateName?: string
  queuePosition?: number
  queueTotal?: number
  onComplete: (result: PassportDocumentAttachmentResult) => void
}

export function PassportDocumentAttachmentDialog({
  open,
  passportId,
  individualProcessId,
  candidateName,
  queuePosition,
  queueTotal,
  onComplete,
}: PassportDocumentAttachmentDialogProps) {
  const t = useTranslations("Passports")
  const attachPassportFile = useMutation(api.passportDocumentAttachments.attach)
  const candidates = useQuery(
    api.passportDocumentAttachments.listCandidates,
    open && passportId
      ? individualProcessId
        ? { passportId, individualProcessId }
        : { passportId }
      : "skip",
  )

  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("")
  const [attachmentMode, setAttachmentMode] =
    useState<AttachmentMode>("new_version")
  const [isAttaching, setIsAttaching] = useState(false)
  const [autoAttachmentFailed, setAutoAttachmentFailed] = useState(false)
  const emptyResultHandledRef = useRef<string | null>(null)
  const automaticAttachmentHandledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open || !passportId) {
      emptyResultHandledRef.current = null
      automaticAttachmentHandledRef.current = null
      setSelectedDocumentId("")
      setAttachmentMode("new_version")
      setAutoAttachmentFailed(false)
      return
    }

    const resultKey = `${passportId}:${individualProcessId ?? "all"}`

    if (candidates?.length) {
      const selectedStillExists = candidates.some(
        (candidate) => candidate.documentId === selectedDocumentId,
      )
      if (!selectedStillExists) {
        setSelectedDocumentId(candidates[0].documentId)
        setAttachmentMode("new_version")
      }
      return
    }

    if (
      candidates?.length === 0 &&
      emptyResultHandledRef.current !== resultKey
    ) {
      emptyResultHandledRef.current = resultKey
      onComplete("no_candidate")
    }
  }, [
    candidates,
    individualProcessId,
    onComplete,
    open,
    passportId,
    selectedDocumentId,
  ])

  const selectedCandidate = candidates?.find(
    (candidate) => candidate.documentId === selectedDocumentId,
  )
  const automaticCandidate =
    candidates?.length === 1 && candidates[0].isOfficialPassport
      ? candidates[0]
      : undefined
  const shouldAutoAttach =
    automaticCandidate !== undefined && !autoAttachmentFailed
  const dialogOpen =
    open &&
    passportId !== undefined &&
    (candidates === undefined || candidates.length > 0)

  const handleSelectCandidate = (documentId: string) => {
    setSelectedDocumentId(documentId)
    setAttachmentMode("new_version")
  }

  const handleSkip = () => {
    if (isAttaching) return
    onComplete("skipped")
  }

  const handleAttach = async () => {
    if (!passportId || !selectedCandidate || isAttaching) return

    try {
      setIsAttaching(true)
      await attachPassportFile({
        passportId,
        ...(individualProcessId ? { individualProcessId } : {}),
        documentId: selectedCandidate.documentId,
        expectedVersion: selectedCandidate.currentVersion,
        mode: selectedCandidate.hasFile ? attachmentMode : "fill",
      })
      toast.success(t("documentAttachmentSuccess"))
      onComplete("attached")
    } catch (error) {
      const isVersionConflict =
        error instanceof Error &&
        error.message.includes("DOCUMENT_VERSION_CONFLICT")
      toast.error(
        isVersionConflict
          ? t("documentAttachmentConflict")
          : t("documentAttachmentError"),
      )
    } finally {
      setIsAttaching(false)
    }
  }

  useEffect(() => {
    if (
      !open ||
      !passportId ||
      !automaticCandidate ||
      autoAttachmentFailed ||
      isAttaching
    ) {
      return
    }

    const resultKey = `${passportId}:${automaticCandidate.documentId}:${automaticCandidate.currentVersion}`
    if (automaticAttachmentHandledRef.current === resultKey) return
    automaticAttachmentHandledRef.current = resultKey

    const attachOfficialPassport = async () => {
      try {
        setIsAttaching(true)
        await attachPassportFile({
          passportId,
          ...(individualProcessId ? { individualProcessId } : {}),
          documentId: automaticCandidate.documentId,
          expectedVersion: automaticCandidate.currentVersion,
          mode: automaticCandidate.hasFile ? "new_version" : "fill",
        })
        toast.success(t("documentAttachmentOfficialSuccess"))
        onComplete("attached")
      } catch {
        automaticAttachmentHandledRef.current = null
        setAutoAttachmentFailed(true)
        toast.error(t("documentAttachmentError"))
      } finally {
        setIsAttaching(false)
      }
    }

    void attachOfficialPassport()
  }, [
    attachPassportFile,
    autoAttachmentFailed,
    automaticCandidate,
    individualProcessId,
    isAttaching,
    onComplete,
    open,
    passportId,
    t,
  ])

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !shouldAutoAttach) handleSkip()
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        showCloseButton={!isAttaching && !shouldAutoAttach}
        aria-busy={isAttaching}
      >
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-5 text-primary" />
              <DialogTitle>{t("documentAttachmentTitle")}</DialogTitle>
            </div>
            {queuePosition !== undefined && queueTotal !== undefined && (
              <Badge variant="outline">
                {t("documentAttachmentProgress", {
                  current: queuePosition,
                  total: queueTotal,
                })}
              </Badge>
            )}
          </div>
          <DialogDescription>
            {shouldAutoAttach
              ? t("documentAttachmentOfficialDescription")
              : t(
                  individualProcessId
                    ? "documentAttachmentScopedDescription"
                    : "documentAttachmentDescription",
                )}
          </DialogDescription>
          {candidateName && (
            <p className="break-words text-sm font-medium text-foreground">
              {t("documentAttachmentCandidate", { candidate: candidateName })}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-5">
          {candidates === undefined && (
            <div
              className="flex min-h-32 items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" />
              {t("documentAttachmentSearching")}
            </div>
          )}

          {candidates && candidates.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("documentAttachmentSelectDestination")}
              </p>
              <ScrollArea className="max-h-72 pr-3">
                <div
                  className="space-y-2"
                  role="radiogroup"
                  aria-label={t("documentAttachmentSelectDestination")}
                >
                  {candidates.map((candidate) => (
                    <label
                      key={candidate.documentId}
                      className="block cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="passport-document-destination"
                        value={candidate.documentId}
                        checked={selectedDocumentId === candidate.documentId}
                        onChange={() =>
                          handleSelectCandidate(candidate.documentId)
                        }
                        disabled={isAttaching}
                        className="peer sr-only"
                      />
                      <CandidateCard
                        candidate={candidate}
                        selected={selectedDocumentId === candidate.documentId}
                      />
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {shouldAutoAttach && (
            <div
              className="flex min-h-32 items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" />
              {t("documentAttachmentOfficialSaving")}
            </div>
          )}

          {selectedCandidate &&
            candidates?.length === 1 &&
            !shouldAutoAttach && (
              <CandidateCard candidate={selectedCandidate} selected />
            )}

          {selectedCandidate?.hasFile && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">
                {t("documentAttachmentExistingFileQuestion")}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <AttachmentModeCard
                  id="passport-attachment-new-version"
                  icon={FileClock}
                  title={t("documentAttachmentNewVersion")}
                  description={t("documentAttachmentNewVersionDescription", {
                    version: selectedCandidate.currentVersion + 1,
                  })}
                  checked={attachmentMode === "new_version"}
                  disabled={isAttaching}
                  onChange={() => setAttachmentMode("new_version")}
                />
                <AttachmentModeCard
                  id="passport-attachment-replace"
                  icon={Replace}
                  title={t("documentAttachmentReplace")}
                  description={t("documentAttachmentReplaceDescription", {
                    version: selectedCandidate.currentVersion,
                  })}
                  checked={attachmentMode === "replace"}
                  disabled={isAttaching}
                  onChange={() => setAttachmentMode("replace")}
                />
              </div>
            </fieldset>
          )}

          <p className="sr-only" aria-live="polite">
            {isAttaching ? t("documentAttachmentSaving") : ""}
          </p>
        </div>

        {candidates !== undefined && !shouldAutoAttach && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isAttaching}
            >
              {t("documentAttachmentNotNow")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleAttach()}
              disabled={!selectedCandidate || isAttaching}
            >
              {isAttaching && <Loader2 className="animate-spin" />}
              {isAttaching
                ? t("documentAttachmentSaving")
                : t("documentAttachmentConfirm")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface CandidateCardProps {
  candidate: {
    documentId: Id<"documentsDelivered">
    individualProcessId: Id<"individualProcesses">
    processReference: string | null
    legalFrameworkName: string | null
    documentName: string
    currentVersion: number
    currentFileName: string | null
    hasFile: boolean
    isOfficialPassport: boolean
  }
  selected: boolean
}

function CandidateCard({ candidate, selected }: CandidateCardProps) {
  const t = useTranslations("Passports")
  const processLabel =
    candidate.processReference ??
    t("documentAttachmentProcessFallback", {
      id: candidate.individualProcessId.slice(-6),
    })

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5"
          : "hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{candidate.documentName}</p>
          <p className="text-sm text-muted-foreground">{processLabel}</p>
          {candidate.legalFrameworkName && (
            <p className="text-xs text-muted-foreground">
              {candidate.legalFrameworkName}
            </p>
          )}
          {candidate.currentFileName && (
            <p className="truncate text-xs text-muted-foreground">
              {candidate.currentFileName}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge variant={candidate.hasFile ? "warning" : "secondary"}>
            {candidate.hasFile
              ? t("documentAttachmentHasFile")
              : t("documentAttachmentPending")}
          </Badge>
          <Badge variant="outline">
            {t("documentAttachmentVersion", {
              version: candidate.currentVersion,
            })}
          </Badge>
        </div>
      </div>
    </div>
  )
}

interface AttachmentModeCardProps {
  id: string
  icon: LucideIcon
  title: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: () => void
}

function AttachmentModeCard({
  id,
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: AttachmentModeCardProps) {
  return (
    <label htmlFor={id} className="block cursor-pointer">
      <input
        id={id}
        type="radio"
        name="passport-document-attachment-mode"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <div
        className={cn(
          "h-full rounded-lg border p-4 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
          checked
            ? "border-primary bg-primary/5"
            : "hover:border-primary/40 hover:bg-muted/40",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <span className="font-medium">{title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </label>
  )
}
