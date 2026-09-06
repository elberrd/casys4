"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { useTranslations } from "next-intl"
import { Download, FileText, Loader2 } from "lucide-react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CriminalBackgroundDeclarationPreview } from "@/components/process-reports/criminal-background-declaration-preview"
import { buildCriminalBackgroundDeclaration } from "@/lib/process-reports/criminal-background-declaration"
import { todayIsoInSaoPaulo } from "@/lib/process-reports/pt-dates"
import type { MissingFieldKey, ProcessReportType } from "@/lib/process-reports/types"
import { toast } from "sonner"

interface ProcessReportPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processId: Id<"individualProcesses">
  reportType: ProcessReportType | null
}

function sanitizeFilename(value: string): string {
  return value.trim().replace(/[<>:"/\\|?*]/g, "") || "relatorio"
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function ProcessReportPreviewDialog({
  open,
  onOpenChange,
  processId,
  reportType,
}: ProcessReportPreviewDialogProps) {
  const t = useTranslations("ProcessReports")
  const [filename, setFilename] = useState("")
  const [isDownloading, setIsDownloading] = useState<"pdf" | "docx" | null>(null)
  const [todayIso, setTodayIso] = useState(() => todayIsoInSaoPaulo())

  const source = useQuery(
    api.processReports.getDeclarationSource,
    open && reportType === "criminalBackgroundDeclaration"
      ? { individualProcessId: processId }
      : "skip",
  )

  useEffect(() => {
    if (open) {
      setTodayIso(todayIsoInSaoPaulo())
    }
  }, [open])

  const report = useMemo(() => {
    if (!source) return null
    return buildCriminalBackgroundDeclaration({
      ...source,
      todayIso,
    })
  }, [source, todayIso])

  const displayFilename = filename || report?.filenameBase || ""

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFilename("")
      setIsDownloading(null)
    }
    onOpenChange(nextOpen)
  }

  const handleDownloadPdf = async () => {
    if (!report) return
    setIsDownloading("pdf")
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { CriminalBackgroundDeclarationPdf } = await import(
        "@/components/process-reports/criminal-background-declaration-pdf"
      )
      const blob = await pdf(
        CriminalBackgroundDeclarationPdf({ report }),
      ).toBlob()
      const name = sanitizeFilename(displayFilename)
      triggerDownload(blob, name.endsWith(".pdf") ? name : `${name}.pdf`)
    } catch (error) {
      console.error(error)
      toast.error(t("errorDownload"))
    } finally {
      setIsDownloading(null)
    }
  }

  const handleDownloadDocx = async () => {
    if (!report) return
    setIsDownloading("docx")
    try {
      const { buildCriminalBackgroundDeclarationDocx } = await import(
        "@/components/process-reports/criminal-background-declaration-docx"
      )
      const blob = await buildCriminalBackgroundDeclarationDocx(report)
      const name = sanitizeFilename(displayFilename)
      triggerDownload(blob, name.endsWith(".docx") ? name : `${name}.docx`)
    } catch (error) {
      console.error(error)
      toast.error(t("errorDownload"))
    } finally {
      setIsDownloading(null)
    }
  }

  const isLoading = open && source === undefined
  const loadFailed = open && source === null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        variant="fullscreen"
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{t("previewTitle")}</DialogTitle>
        </DialogHeader>

        {report && (
          <div className="px-6 pb-2">
            <Label htmlFor="report-filename" className="mb-1 text-xs text-muted-foreground">
              {t("filenameLabel")}
            </Label>
            <Input
              id="report-filename"
              value={displayFilename}
              onChange={(event) => setFilename(event.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}

        {report && report.missingFields.length > 0 && (
          <div className="px-6 pb-2">
            <Alert>
              <FileText />
              <AlertTitle>{t("missingFieldsTitle")}</AlertTitle>
              <AlertDescription>
                {t("missingFieldsDescription")}{" "}
                {report.missingFields
                  .map((field: MissingFieldKey) => t(`missingFields.${field}`))
                  .join(", ")}
                .
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="min-h-0 flex-1 bg-muted/40 px-6 py-2">
          {isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("generating")}</p>
            </div>
          )}

          {loadFailed && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-destructive">{t("errorLoad")}</p>
            </div>
          )}

          {report && (
            <ScrollArea className="h-full">
              <div className="py-4">
                <CriminalBackgroundDeclarationPreview
                  report={report}
                  ariaLabel={t("previewAriaLabel")}
                />
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 sm:justify-between">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("close")}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="gap-2"
              disabled={!report || isDownloading !== null}
              onClick={() => void handleDownloadDocx()}
            >
              {isDownloading === "docx" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("downloadDocx")}
            </Button>
            <Button
              className="gap-2"
              disabled={!report || isDownloading !== null}
              onClick={() => void handleDownloadPdf()}
            >
              {isDownloading === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("downloadPdf")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
