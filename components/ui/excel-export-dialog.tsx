"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  exportToExcel,
  type ExcelColumnConfig,
  type ExcelGroupConfig,
} from "@/lib/utils/excel-export-helpers"

export interface ExcelExportDialogProps {
  columns: ExcelColumnConfig[]
  data: any[] | ExcelGroupConfig[]
  defaultFilename?: string
  grouped?: boolean
  children?: React.ReactNode
  onExportComplete?: () => void
}

const filenameSchema = z
  .string()
  .min(1, "Filename is required")
  .max(255, "Filename must be less than 255 characters")

export function ExcelExportDialog({
  columns,
  data,
  defaultFilename = "export",
  grouped = false,
  children,
  onExportComplete,
}: ExcelExportDialogProps) {
  const t = useTranslations("Export")
  const [open, setOpen] = useState(false)
  const [filename, setFilename] = useState(defaultFilename)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    // Validate filename
    const validation = filenameSchema.safeParse(filename.trim())

    if (!validation.success) {
      setError(t("filenameRequired"))
      return
    }

    setError(null)
    setIsExporting(true)

    try {
      await exportToExcel(columns, data, filename.trim(), {
        grouped,
        groupHeaderColor: "4472C4",
      })

      toast.success(t("excelExportSuccess"))
      setOpen(false)
      onExportComplete?.()

      // Reset filename for next export
      setFilename(defaultFilename)
    } catch (err) {
      console.error("Excel export error:", err)
      toast.error(t("excelExportError"))
      setError(t("excelExportError"))
    } finally {
      setIsExporting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      // Reset state when opening
      setFilename(defaultFilename)
      setError(null)
    }
  }

  const isFilenameValid = filename.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("exportToExcel")}</DialogTitle>
          <DialogDescription>
            {t("enterFilename")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="filename">{t("enterFilename")}</Label>
            <Input
              id="filename"
              type="text"
              placeholder={t("filenamePlaceholder")}
              value={filename}
              onChange={(e) => {
                setFilename(e.target.value)
                setError(null)
              }}
              disabled={isExporting}
              className={error ? "border-red-500" : ""}
              maxLength={255}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {filename.length}/255 characters
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={!isFilenameValid || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("exportingExcel")}
              </>
            ) : (
              t("exportExcel")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
