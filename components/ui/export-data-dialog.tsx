"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useQuery, useConvex } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Download, FileDown, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import {
  objectsToCSV,
  downloadCSV,
  generateExportFilename,
} from "@/lib/utils/export-helpers"

export type ExportType = "mainProcesses" | "individualProcesses" | "people" | "documents" | "tasks"

export interface ExportDataDialogProps {
  children?: React.ReactNode
  defaultExportType?: ExportType
  defaultFilters?: {
    companyId?: Id<"companies">
    mainProcessId?: Id<"mainProcesses">
    statusFilter?: string
  }
}

export function ExportDataDialog({
  children,
  defaultExportType = "mainProcesses",
  defaultFilters = {},
}: ExportDataDialogProps) {
  const t = useTranslations("Export")
  const tCommon = useTranslations("Common")

  const [open, setOpen] = useState(false)
  const [exportType, setExportType] = useState<ExportType>(defaultExportType)
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [statusFilter, setStatusFilter] = useState<string>(defaultFilters.statusFilter || "all")
  const [companyFilter, setCompanyFilter] = useState<string>(
    defaultFilters.companyId || "all"
  )
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  // Get Convex client with authentication
  const convex = useConvex()

  // Get current user profile for role checks
  const userProfile = useQuery(api.userProfiles.getCurrentUser)

  // Get companies list (admin only)
  const companies = useQuery(
    api.companies.list,
    userProfile?.role === "admin" ? {} : "skip"
  )

  const handleExport = async () => {
    setIsExporting(true)
    setProgress(0)

    try {
      setProgress(20)

      // Prepare query args based on export type
      const baseArgs = {
        dateFrom: dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined,
        dateTo: dateTo ? format(dateTo, "yyyy-MM-dd") : undefined,
        statusFilter: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
        companyId: companyFilter && companyFilter !== "all" ? (companyFilter as Id<"companies">) : undefined,
      }

      setProgress(40)

      // Fetch data based on export type
      let data: any[] = []
      let filename = ""

      switch (exportType) {
        case "mainProcesses": {
          data = await convex.query(api.exports.exportMainProcesses, baseArgs)
          filename = generateExportFilename("main_processes")
          break
        }
        case "individualProcesses": {
          data = await convex.query(api.exports.exportIndividualProcesses, {
            ...baseArgs,
            mainProcessId: defaultFilters.mainProcessId,
          })
          filename = generateExportFilename("individual_processes")
          break
        }
        case "people": {
          data = await convex.query(api.exports.exportPeople, {
            companyId: companyFilter && companyFilter !== "all" ? (companyFilter as Id<"companies">) : undefined,
          })
          filename = generateExportFilename("people")
          break
        }
        case "documents": {
          data = await convex.query(api.exports.exportDocuments, baseArgs)
          filename = generateExportFilename("documents")
          break
        }
        case "tasks": {
          data = await convex.query(api.exports.exportTasks, baseArgs)
          filename = generateExportFilename("tasks")
          break
        }
      }

      setProgress(60)

      // Convert to CSV
      const csvContent = objectsToCSV(data)

      setProgress(80)

      // Download CSV
      downloadCSV(csvContent, filename)

      setProgress(100)

      // Close dialog after short delay
      setTimeout(() => {
        setOpen(false)
        setIsExporting(false)
        setProgress(0)
      }, 500)
    } catch (error) {
      console.error("Export failed:", error)
      setIsExporting(false)
      setProgress(0)
      // TODO: Show error toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            {t("export")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("exportData")}</DialogTitle>
          <DialogDescription>{t("exportDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Type */}
          <div className="space-y-2">
            <Label htmlFor="export-type">{t("exportType")}</Label>
            <Select value={exportType} onValueChange={(value) => setExportType(value as ExportType)}>
              <SelectTrigger id="export-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mainProcesses">{t("mainProcesses")}</SelectItem>
                <SelectItem value="individualProcesses">{t("individualProcesses")}</SelectItem>
                <SelectItem value="people">{t("people")}</SelectItem>
                <SelectItem value="documents">{t("documents")}</SelectItem>
                <SelectItem value="tasks">{t("tasks")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("dateFrom")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : t("selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("dateTo")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : t("selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Status Filter (for applicable types) */}
          {(exportType === "mainProcesses" ||
            exportType === "individualProcesses" ||
            exportType === "documents" ||
            exportType === "tasks") && (
            <div className="space-y-2">
              <Label htmlFor="status-filter">{t("statusFilter")}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder={t("allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  {/* Add status options based on export type */}
                  {exportType === "mainProcesses" && (
                    <>
                      <SelectItem value="pending">{tCommon("pending")}</SelectItem>
                      <SelectItem value="in_progress">{tCommon("inProgress")}</SelectItem>
                      <SelectItem value="completed">{tCommon("completed")}</SelectItem>
                      <SelectItem value="cancelled">{tCommon("cancelled")}</SelectItem>
                    </>
                  )}
                  {exportType === "individualProcesses" && (
                    <>
                      <SelectItem value="pending">{tCommon("pending")}</SelectItem>
                      <SelectItem value="document_collection">{tCommon("documentCollection")}</SelectItem>
                      <SelectItem value="submitted">{tCommon("submitted")}</SelectItem>
                      <SelectItem value="approved">{tCommon("approved")}</SelectItem>
                    </>
                  )}
                  {exportType === "documents" && (
                    <>
                      <SelectItem value="pending">{tCommon("pending")}</SelectItem>
                      <SelectItem value="approved">{tCommon("approved")}</SelectItem>
                      <SelectItem value="rejected">{tCommon("rejected")}</SelectItem>
                    </>
                  )}
                  {exportType === "tasks" && (
                    <>
                      <SelectItem value="todo">{tCommon("todo")}</SelectItem>
                      <SelectItem value="in_progress">{tCommon("inProgress")}</SelectItem>
                      <SelectItem value="completed">{tCommon("completed")}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Company Filter (admin only) */}
          {userProfile?.role === "admin" && (
            <div className="space-y-2">
              <Label htmlFor="company-filter">{t("companyFilter")}</Label>
              <Select
                value={companyFilter}
                onValueChange={setCompanyFilter}
              >
                <SelectTrigger id="company-filter">
                  <SelectValue placeholder={t("allCompanies")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCompanies")}</SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company._id} value={company._id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2">
              <Label>{t("exporting")}</Label>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{progress}%</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("exporting")}
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                {t("exportCSV")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
