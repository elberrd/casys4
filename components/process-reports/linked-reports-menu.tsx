"use client"

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
import { formatLinkedDocumentTypeNames } from "@/lib/report-templates/attach-targets"
import { cn } from "@/lib/utils"

export type LinkedReportOption = {
  _id: Id<"reportTemplates">
  name: string
  documentTypes?: Array<{ _id: Id<"documentTypes">; name: string }>
}

interface LinkedReportsMenuProps {
  reports: LinkedReportOption[]
  onSelect: (templateId: Id<"reportTemplates">) => void
  disabled?: boolean
  align?: "start" | "end"
  showDocumentTypes?: boolean
  triggerLabel?: string
  triggerClassName?: string
  contentClassName?: string
}

export function LinkedReportsMenu({
  reports,
  onSelect,
  disabled,
  align = "end",
  showDocumentTypes = false,
  triggerLabel,
  triggerClassName,
  contentClassName,
}: LinkedReportsMenuProps) {
  const t = useTranslations("DocumentChecklist")
  if (reports.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("h-8 cursor-pointer gap-1", triggerClassName)}
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
        >
          <FileText className="h-3.5 w-3.5" />
          {triggerLabel ?? t("linkedReports")}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("max-h-80 max-w-80 overflow-y-auto", contentClassName)}
        onClick={(event) => event.stopPropagation()}
      >
        {reports.map((report) => {
          const linkedNames = report.documentTypes
            ? formatLinkedDocumentTypeNames(report.documentTypes)
            : ""
          return (
            <DropdownMenuItem
              key={report._id}
              className="items-start whitespace-normal"
              onClick={(event) => {
                event.stopPropagation()
                onSelect(report._id)
              }}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="leading-snug font-medium">{report.name}</span>
                {showDocumentTypes && linkedNames ? (
                  <span className="text-muted-foreground text-xs leading-snug">
                    {linkedNames}
                  </span>
                ) : null}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
