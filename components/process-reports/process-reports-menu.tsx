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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CustomReportGenerateDialog } from "@/components/process-reports/custom-report-generate-dialog"

interface ProcessReportsMenuProps {
  processId: Id<"individualProcesses">
}

export function ProcessReportsMenu({ processId }: ProcessReportsMenuProps) {
  const t = useTranslations("ProcessReports")
  const tProcess = useTranslations("IndividualProcesses")
  const templates = useQuery(api.reportTemplates.listActiveSummaries, {
    individualProcessId: processId,
  })
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
          {templates === undefined ? null : templates.length === 0 ? (
            <DropdownMenuItem disabled>{t("noActiveTemplates")}</DropdownMenuItem>
          ) : (
            templates.map((template) => (
              <DropdownMenuItem
                key={template._id}
                onClick={() => setCustomTemplateId(template._id)}
              >
                {template.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
