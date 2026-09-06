"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, FileText } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProcessReportPreviewDialog } from "@/components/process-reports/process-report-preview-dialog"
import type { ProcessReportType } from "@/lib/process-reports/types"

interface ProcessReportsMenuProps {
  processId: Id<"individualProcesses">
}

export function ProcessReportsMenu({ processId }: ProcessReportsMenuProps) {
  const t = useTranslations("ProcessReports")
  const tProcess = useTranslations("IndividualProcesses")
  const [reportType, setReportType] = useState<ProcessReportType | null>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex-1 gap-2 sm:flex-none">
            <FileText className="h-4 w-4" />
            {tProcess("reports")}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setReportType("criminalBackgroundDeclaration")}
          >
            {t("types.criminalBackgroundDeclaration")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProcessReportPreviewDialog
        open={reportType !== null}
        onOpenChange={(open) => {
          if (!open) setReportType(null)
        }}
        processId={processId}
        reportType={reportType}
      />
    </>
  )
}
