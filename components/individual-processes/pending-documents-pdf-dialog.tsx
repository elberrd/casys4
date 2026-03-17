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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Download } from "lucide-react"
import type {
  PdfReportMode,
  ProcessInfoForReport,
  PdfDocumentItem,
  PdfExigenciaGroup,
} from "@/lib/utils/pdf-report-helpers"

interface PendingDocumentsPdfDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportMode: PdfReportMode
  processInfo: ProcessInfoForReport
  pendingDocuments: PdfDocumentItem[]
  exigenciaGroups: PdfExigenciaGroup[]
}

type DialogPhase = "idle" | "generating" | "preview"

export function PendingDocumentsPdfDialog({
  open,
  onOpenChange,
  reportMode,
  processInfo,
  pendingDocuments,
  exigenciaGroups,
}: PendingDocumentsPdfDialogProps) {
  const t = useTranslations("DocumentChecklist")
  const [phase, setPhase] = useState<DialogPhase>("idle")
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [filename, setFilename] = useState("")

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

    // Set default filename when dialog opens
    const personName = processInfo.personFullName || "processo"
    const dateSlug = new Date().toISOString().slice(0, 10)
    setFilename(`${personName} - pendentes - ${dateSlug}`)

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
          reportMode,
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
  }, [open, reportMode])

  const handleDownload = () => {
    if (!blobUrl) return
    // Sanitize filename: remove characters invalid in filenames
    const sanitized = filename.trim().replace(/[<>:"/\\|?*]/g, "") || "report"
    const downloadName = sanitized.endsWith(".pdf")
      ? sanitized
      : `${sanitized}.pdf`

    const a = document.createElement("a")
    a.href = blobUrl
    a.download = downloadName
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

        {phase === "preview" && (
          <div className="px-6 pb-2">
            <Label htmlFor="pdf-filename" className="text-xs text-muted-foreground mb-1">
              {t("pdfReport.filenameLabel")}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="pdf-filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="h-8 text-sm"
              />
              <span className="text-sm text-muted-foreground shrink-0">.pdf</span>
            </div>
          </div>
        )}

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
