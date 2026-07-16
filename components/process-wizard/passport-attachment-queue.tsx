"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { Id } from "@/convex/_generated/dataModel"
import {
  PassportDocumentAttachmentDialog,
  type PassportDocumentAttachmentResult,
} from "@/components/passports/passport-document-attachment-dialog"

export interface PassportAttachmentQueueEntry {
  individualProcessId: Id<"individualProcesses">
  passportId: Id<"passports">
  candidateName: string
}

export interface PassportAttachmentQueueSummary {
  attached: number
  skipped: number
  noCandidate: number
}

interface PassportAttachmentQueueProps {
  open: boolean
  entries: PassportAttachmentQueueEntry[]
  onComplete: (summary: PassportAttachmentQueueSummary) => void
}

const EMPTY_SUMMARY: PassportAttachmentQueueSummary = {
  attached: 0,
  skipped: 0,
  noCandidate: 0,
}

export function PassportAttachmentQueue({
  open,
  entries,
  onComplete,
}: PassportAttachmentQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [summary, setSummary] =
    useState<PassportAttachmentQueueSummary>(EMPTY_SUMMARY)
  const didCompleteRef = useRef(false)

  useEffect(() => {
    if (!open || entries.length > 0 || didCompleteRef.current) return

    didCompleteRef.current = true
    onComplete(EMPTY_SUMMARY)
  }, [entries.length, onComplete, open])

  const handleItemComplete = useCallback(
    (result: PassportDocumentAttachmentResult) => {
      if (didCompleteRef.current) return

      const nextSummary = {
        ...summary,
        attached: summary.attached + (result === "attached" ? 1 : 0),
        skipped: summary.skipped + (result === "skipped" ? 1 : 0),
        noCandidate:
          summary.noCandidate + (result === "no_candidate" ? 1 : 0),
      }
      const nextIndex = currentIndex + 1

      setSummary(nextSummary)
      if (nextIndex >= entries.length) {
        didCompleteRef.current = true
        onComplete(nextSummary)
        return
      }

      setCurrentIndex(nextIndex)
    },
    [currentIndex, entries.length, onComplete, summary]
  )

  const currentEntry = entries[currentIndex]
  if (!open || !currentEntry) return null

  return (
    <PassportDocumentAttachmentDialog
      key={`${currentEntry.individualProcessId}:${currentEntry.passportId}`}
      open
      passportId={currentEntry.passportId}
      individualProcessId={currentEntry.individualProcessId}
      candidateName={currentEntry.candidateName}
      queuePosition={currentIndex + 1}
      queueTotal={entries.length}
      onComplete={handleItemComplete}
    />
  )
}
