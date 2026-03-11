"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import type {
  ProcessInfoForReport,
  PdfDocumentItem,
  PdfExigenciaGroup,
} from "@/lib/utils/pdf-report-helpers"

interface PendingDocumentsPdfDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processInfo: ProcessInfoForReport
  pendingDocuments: PdfDocumentItem[]
  exigenciaGroups: PdfExigenciaGroup[]
}

type DialogPhase = "idle" | "generating" | "preview"

export function PendingDocumentsPdfDialog({
  open,
  onOpenChange,
  processInfo,
  pendingDocuments,
  exigenciaGroups,
}: PendingDocumentsPdfDialogProps) {
  const t = useTranslations("DocumentChecklist")
  const [phase, setPhase] = useState<DialogPhase>("idle")
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const cleanup = useCallback(() => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }
    setPhase("idle")
  }, [blobUrl])

  // Generate PDF when dialog opens
  useEffect(() => {
    if (!open) {
      cleanup()
      return
    }

    let cancelled = false

    async function generate() {
      setPhase("generating")
      try {
        const { pdf } = await import("@react-pdf/renderer")
        const { PendingDocumentsPdfTemplate } = await import(
          "./pending-documents-pdf-template"
        )

        const now = new Date()
        const generatedAt = now.toLocaleString("pt-BR")

        const labels = {
          reportTitle: t("pdfReport.title"),
          generatedAt: t("pdfReport.generatedAtLabel"),
          person: t("pdfReport.person"),
          legalFramework: t("pdfReport.legalFramework"),
          processType: t("pdfReport.processType"),
          company: t("pdfReport.company"),
          referenceNumber: t("pdfReport.referenceNumber"),
          protocolNumber: t("pdfReport.protocolNumber"),
          dateProcess: t("pdfReport.dateProcess"),
          exigenciaSection: t("pdfReport.exigenciaSection"),
          pendingSection: t("pdfReport.pendingSection"),
          pendingSectionTitle: t("pdfReport.pendingSectionTitle"),
          required: t("pdfReport.required"),
          optional: t("pdfReport.optional"),
          page: t("pdfReport.page"),
          of: t("pdfReport.of"),
          companyDoc: t("pdfReport.companyDoc"),
          document: t("pdfReport.document"),
          deadline: t("pdfReport.deadline"),
          status: t("pdfReport.status"),
        }

        const element = PendingDocumentsPdfTemplate({
          processInfo,
          pendingDocuments,
          exigenciaGroups,
          generatedAt,
          labels,
        })

        const blob = await pdf(element).toBlob()
        if (cancelled) return

        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
        setPhase("preview")
      } catch (err) {
        console.error("PDF generation failed:", err)
        if (!cancelled) {
          setPhase("idle")
          onOpenChange(false)
        }
      }
    }

    generate()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleDownload = () => {
    if (!blobUrl) return
    const personSlug = (processInfo.personFullName || "processo")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
    const dateSlug = new Date().toISOString().slice(0, 10)
    const filename = `documentos-pendentes-${personSlug}-${dateSlug}.pdf`

    const a = document.createElement("a")
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{t("pdfReport.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6">
          {phase === "generating" && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("pdfReport.generating")}
              </p>
            </div>
          )}

          {phase === "preview" && blobUrl && (
            <iframe
              src={blobUrl}
              className="h-full w-full rounded-md border"
              title="PDF Preview"
            />
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={handleClose}>
            {t("pdfReport.close")}
          </Button>
          {phase === "preview" && (
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              {t("pdfReport.save")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
