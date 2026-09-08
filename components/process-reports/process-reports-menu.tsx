"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { ChevronDown, FileText } from "lucide-react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProcessReportPreviewDialog } from "@/components/process-reports/process-report-preview-dialog"
import { CustomReportGenerateDialog } from "@/components/process-reports/custom-report-generate-dialog"
import type { ProcessReportType } from "@/lib/process-reports/types"

interface ProcessReportsMenuProps {
  processId: Id<"individualProcesses">
}

export function ProcessReportsMenu({ processId }: ProcessReportsMenuProps) {
  const t = useTranslations("ProcessReports")
  const tProcess = useTranslations("IndividualProcesses")
  const templates = useQuery(api.reportTemplates.listActiveSummaries, {})
  const [reportType, setReportType] = useState<ProcessReportType | null>(null)
  const [customTemplateId, setCustomTemplateId] =
    useState<Id<"reportTemplates"> | null>(null)

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
        <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
          <DropdownMenuItem
            onClick={() => setReportType("criminalBackgroundDeclaration")}
          >
            {t("types.criminalBackgroundDeclaration")}
          </DropdownMenuItem>
          {templates && templates.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {templates.map((template) => (
                <DropdownMenuItem
                  key={template._id}
                  onClick={() => setCustomTemplateId(template._id)}
                >
                  {template.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
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

      <CustomReportGenerateDialog
        open={customTemplateId !== null}
        onOpenChange={(open) => {
          if (!open) setCustomTemplateId(null)
        }}
        processId={processId}
        templateId={customTemplateId}
      />
    </>
  )
}
